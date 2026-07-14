import { Server, ServerCredentials } from '@grpc/grpc-js';
import {
  GithubServiceService,
  GithubServiceServer,
} from '../../../libs/contracts/grpc/github/v1/github';
import { AppLogger } from '../../../libs/infrastructure/logger/interfaces/logger.interface';

export class GrpcAppServer {
  private readonly server: Server;
  private isStarted: boolean = false;

  constructor(
    private readonly githubHandler: GithubServiceServer,
    private readonly logger: AppLogger,
  ) {
    this.server = new Server();
    this.registerServices();
  }

  public get started(): boolean {
    return this.isStarted;
  }

  public async start(address: string): Promise<void> {
    if (this.isStarted) {
      this.logger.warn(
        `Attempted to start gRPC GitHub server, but it is already running on ${address}`,
      );
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        address,
        ServerCredentials.createInsecure(),
        (err: Error | null, port: number) => {
          if (err) {
            this.logger.error({ err }, `Failed to bind gRPC Server to ${address}`);
            return reject(err);
          }

          this.isStarted = true;
          this.logger.info({ address, port }, `gRPC GitHub Server successfully started`);
          resolve();
        },
      );
    });
  }

  public async close(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn('Attempted gRPC GitHub Server to close, but the server is not running.');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.tryShutdown((error?: Error) => {
        if (error) {
          this.logger.error({ error }, 'Error during graceful gRPC Server shutdown, forcing...');
          this.server.forceShutdown();
          this.isStarted = false;
          return reject(error);
        }

        this.isStarted = false;
        this.logger.info('gRPC GitHub Server successfully closed.');
        resolve();
      });
    });
  }

  private registerServices(): void {
    this.server.addService(GithubServiceService, this.githubHandler);
  }
}

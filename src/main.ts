import { env } from './config/env';
import { createApp } from './app';
import { createContainer } from './container';
import { EMAIL_VERIFICATION_ERROR_KIND } from './email/constants/email-provider';
import { JobsManager } from './jobs/manager';

async function bootstrap() {
  const container = createContainer(env);

  await container.prisma.$connect();
  console.log('Prisma connection established successfully');

  const emailVerification = await container.emailProvider.verifyTransporter();
  if (!emailVerification.ok) {
    if (emailVerification.kind !== EMAIL_VERIFICATION_ERROR_KIND.CONNECTION)
      throw new Error('SMTP authentication failed. Check email credentials.', {
        cause: emailVerification.error,
      });
    console.warn(
      `SMTP is currently unavailable [${emailVerification.kind}]. Server will start without verified email connectivity.`,
      emailVerification.error,
    );
  } else {
    console.log('SMTP connection successful. Email transporter is ready.');
  }

  const app = createApp(container);

  const jobsManager = new JobsManager(
    container.githubRepositoryReleaseJob,
    container.services.subscriptionService,
  );

  jobsManager.startJobs();

  const server = app.listen(env.APP_PORT, () => {
    console.log(`Express server is listening on port ${env.APP_PORT}`);
  });

  async function shutdown() {
    console.log('Shutting down...');
    server.close();

    await container.prisma.$disconnect();
    container.emailProvider.closeConnection();
    await jobsManager.stopJobs();

    console.log('Application shut down successfully.');
    process.exit(0);
  }

  process.on('SIGINT', () => {
    shutdown().catch((err) => {
      console.log('Shutdown failed.', err);
      process.exit(1);
    });
  });
  process.on('SIGTERM', () => {
    shutdown().catch((err) => {
      console.log('Shutdown failed.', err);
      process.exit(1);
    });
  });
}

bootstrap().catch((err) => {
  console.log('Failed to start application.', err);
  process.exit(1);
});

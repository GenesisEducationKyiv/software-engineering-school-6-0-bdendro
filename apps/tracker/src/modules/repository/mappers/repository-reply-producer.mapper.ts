import { Repository } from '../types/repository';
import { Repository as ReplyRepository } from '../../../../../../libs/contracts/tracker/messaging/repository.commands';

export class RepositoryReplyProducerMapper {
  toReplyRepository(repository: Repository): ReplyRepository {
    return {
      id: repository.id,
      repo: repository.repo,
      lastSeenTag: repository.lastSeenTag,
      createdAt: repository.createdAt.toISOString(),
    };
  }
}

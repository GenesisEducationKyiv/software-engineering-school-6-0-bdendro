import { SubscribeSaga } from './subscribe-saga';

export type SubscribeSagaCreateInput = Pick<SubscribeSaga, 'email' | 'repoName'>;

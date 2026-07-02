export interface SubscribeSaga {
  id: number;
  email: string;
  repoName: string;
  repoId: number | null;
  subscriptionId: number | null;
  state: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

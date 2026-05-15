import type { Request } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';

export type ValidatedRequest<
  TBody = unknown,
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery extends Query = Query,
> = Request & {
  validated: {
    body?: TBody;
    params?: TParams;
    query?: TQuery;
  };
};

export type RequestWithValidatedBody<TBody> = Request & {
  validated: {
    body: TBody;
  };
};

export type RequestWithValidatedParams<TParams extends ParamsDictionary> = Request & {
  validated: {
    params: TParams;
  };
};

export type RequestWithValidatedQuery<TQuery extends Query> = Request & {
  validated: {
    query: TQuery;
  };
};

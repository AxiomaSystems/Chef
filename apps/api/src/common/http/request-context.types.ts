export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestContext = {
  requestId: string;
  actorUserId?: string;
};

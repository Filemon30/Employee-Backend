export type EntityId = number;
export type MonetaryAmount = string | number;

export interface ApiListResponse<T> {
  data: T[];
  total: number;
}

export interface ApiItemResponse<T> {
  data: T;
}

import {Model, model, property} from '@loopback/repository';

@model()
export class OrderRequest extends Model {

  @property() username: string;
  @property() amount: number;
  @property() txid?: string;
  @property() orderType: string;

  constructor(data?: Partial<OrderRequest>) {
    super(data);
  }
}

export interface OrderRequestRelations {
  // describe navigational properties here
}

export type OrderRequestWithRelations = OrderRequest & OrderRequestRelations;

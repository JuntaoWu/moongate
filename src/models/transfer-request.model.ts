import {Model, model, property} from '@loopback/repository';

@model()
export class TransferRequest extends Model {

  @property()
  receiver: string;
  @property()
  amount: number;

  constructor(data?: Partial<TransferRequest>) {
    super(data);
  }
}

export interface TransferRequestRelations {
  // describe navigational properties here
}

export type TransferRequestWithRelations = TransferRequest & TransferRequestRelations;

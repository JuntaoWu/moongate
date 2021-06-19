import {User, UserWithRelations} from '@loopback/authentication-jwt';
import {belongsTo, Entity, model, property} from '@loopback/repository';

@model()
export class TransactionHistory extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @property({
    type: 'date'
  })
  date: Date;

  @property({
    type: 'string'
  })
  activity: string;

  @property({
    type: 'string',
    mongodb: {
      dataType: 'Decimal128'
    }
  })
  amount: number;

  @belongsTo(() => User)
  userId: string;

  @property({
    type: 'string'
  })
  orderId: string;

  @property({
    type: 'string'
  })
  status: string;

  constructor(data?: Partial<TransactionHistory>) {
    super(data);
  }
}

export interface TransactionHistoryRelations {
  // describe navigational properties here

  user?: UserWithRelations;

}

export type TransactionHistoryWithRelations = TransactionHistory & TransactionHistoryRelations;

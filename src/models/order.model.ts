import {User} from '@loopback/authentication-jwt';
import {belongsTo, Entity, model, property} from '@loopback/repository';

@model()
export class Order extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @belongsTo(() => User)
  userId: string;

  @property({
    type: 'string'
  })
  username: string;

  @property({
    type: 'string'
  })
  orderType: string;

  @property({
    type: 'string',
    mongodb: {
      dataType: 'Decimal128'
    }
  })
  amount: number;

  @property({
    type: 'date'
  })
  createDate: Date;

  @property({
    type: 'date'
  })
  updateDate: Date;

  @property({
    type: 'string'
  })
  txid?: string;

  @property({
    type: 'string'
  })
  status: string;

  @property({
    type: 'string'
  })
  recordNumber: string;


  constructor(data?: Partial<Order>) {
    super(data);
  }
}

export interface OrderRelations {
  // describe navigational properties here
}

export type OrderWithRelations = Order & OrderRelations;

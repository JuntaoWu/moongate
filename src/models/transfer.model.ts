import {User} from '@loopback/authentication-jwt';
import {belongsTo, Entity, model, property} from '@loopback/repository';

@model()
export class Transfer extends Entity {
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
  sender: string;

  @property({
    type: 'string'
  })
  receiver: string;

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
    type: 'string'
  })
  status: string;

  @property({
    type: 'date'
  })
  updateDate: Date;

  @property({
    type: 'string'
  })
  recordNumber: string;


  constructor(data?: Partial<Transfer>) {
    super(data);
  }
}

export interface TransferRelations {
  // describe navigational properties here
}

export type TransferWithRelations = Transfer & TransferRelations;

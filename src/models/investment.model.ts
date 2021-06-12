import {User, UserWithRelations} from '@loopback/authentication-jwt';
import {belongsTo, Entity, model, property} from '@loopback/repository';

@model()
export class Investment extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  @belongsTo(() => User)
  userId: string;

  @property({
    type: 'string',
    mongodb: {
      dataType: 'Decimal128'
    }
  })
  purchasedTotal: number;

  @property({
    type: 'string',
    mongodb: {
      dataType: 'Decimal128'
    }
  })
  releasedTotal: number;

  @property({
    type: 'string',
    mongodb: {
      dataType: 'Decimal128'
    }
  })
  lockedTotal: number;

  constructor(data?: Partial<Investment>) {
    super(data);
  }
}

export interface InvestmentRelations {
  user?: UserWithRelations;
}

export type InvestmentWithRelations = Investment & InvestmentRelations;

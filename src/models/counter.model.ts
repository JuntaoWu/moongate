import {Entity, model, property} from '@loopback/repository';

@model()
export class Counter extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  collection: string;

  @property({
    type: 'number',
    required: true,
  })
  value: number;

  constructor(data?: Partial<Counter>) {
    super(data);
  }
}

export interface CounterRelations {
  // describe navigational properties here
}

export type CounterWithRelations = Counter & CounterRelations;

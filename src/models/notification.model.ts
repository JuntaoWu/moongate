import {Entity, model, property} from '@loopback/repository';
import {Message, MessageOptions, MessageType, Receiver} from 'loopback4-notifications';

@model({settings: {strict: false}})
export class Notification extends Entity implements Message {
  // Define well-known properties here
  @property({
    type: 'string',
    id: true,
  })
  id?: string;
  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Notification>) {
    super(data);
  }

  @property({
    type: 'string',
    jsonSchema: {
      nullable: true,
    },
  })
  subject?: string | undefined;

  @property({
    type: 'string',
    required: true,
  })
  body: string;

  @property({
    type: 'object',
    required: true,
  })
  receiver: Receiver;

  @property({
    type: 'date',
    name: 'sent',
  })
  sentDate: Date;

  @property({
    type: 'number',
    required: true,
  })
  type: MessageType;

  @property({
    type: 'object',
  })
  options?: MessageOptions | undefined;
}

export interface NotificationRelations {
  // describe navigational properties here
}

export type NotificationWithRelations = Notification & NotificationRelations;

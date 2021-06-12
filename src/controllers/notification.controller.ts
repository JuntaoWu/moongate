// Uncomment these imports to begin using these cool features!

import {inject} from '@loopback/core';
import {getModelSchemaRef, post, requestBody} from '@loopback/rest';
import {INotification, NotificationBindings} from 'loopback4-notifications';
import {Notification} from '../models';

// import {inject} from '@loopback/core';


export class NotificationController {
  constructor(
    @inject(NotificationBindings.NotificationProvider)
    private readonly notifProvider: INotification,
  ) { }

  @post('/notifications', {
    responses: {
      '200': {
        description: 'Notification model instance',
        content: {
          'application/json': {schema: getModelSchemaRef(Notification)},
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Notification),
        },
      },
    })
    notification: Notification,
  ): Promise<Notification> {
    await this.notifProvider.publish(notification);
    return notification;
  }
}

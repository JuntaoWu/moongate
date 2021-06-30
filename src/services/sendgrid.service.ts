import { /* inject, */ BindingKey, BindingScope, inject, injectable} from '@loopback/core';
import {MailService} from '@sendgrid/mail';

export class SendGridBindings {

  /**
   * Binding key for current user profile
   */
  static SEND_GRID_SERVICE: BindingKey<SendgridService> = BindingKey.create<string>('sendgrid.service');
}


@injectable({scope: BindingScope.TRANSIENT})
export class SendgridService {
  constructor(/* Add @inject to inject parameters */@inject(MailService.name) private mailService: MailService) {
    mailService.setApiKey(process.env.SEND_GRID_KEY as any);
  }

  /*
   * Add service methods here
   */
  async send(data: any) {
    return await this.mailService.send(data);
  }

}

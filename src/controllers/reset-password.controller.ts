import {TokenService} from '@loopback/authentication';
import {TokenServiceBindings, UserServiceBindings} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors, post, requestBody, response, ResponseObject, SchemaObject} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {MailDataRequired} from '@sendgrid/mail';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {INotification, NotificationBindings} from 'loopback4-notifications';
import {Status} from '../constant';
import {MoongateUser, ResetPassword} from '../models';
import {MoongateUserRepository} from '../repositories';
import {SendGridBindings, SendgridService} from '../services';
import {UserManagementService} from '../services/user-management.service';


const ResetPasswordSchema: SchemaObject = {
  type: 'object',
  required: ['token', 'password'],
  properties: {
    token: {
      type: 'string',
    },
    password: {
      type: 'string',
      minLength: 6,
    },
  },
};

export const ResetPasswordRequestBody = {
  description: 'The input of reset password function',
  required: true,
  content: {
    'application/json': {schema: ResetPasswordSchema},
  },
};


const ForgotPasswordSchema: SchemaObject = {
  type: 'object',
  required: ['email'],
  properties: {
    email: {
      type: 'string',
      format: 'email'
    }
  }
};

export const ForgotPasswordRequestBody = {
  description: 'The input of forgotPassword function',
  require: true,
  content: {
    'application/json': {schema: ForgotPasswordSchema},
  }
};


/**
 * OpenAPI response for forgotPassword()
 */
export const ForgotPasswordResponse: ResponseObject = {
  description: 'ForgotPassword Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        title: 'ForgotPasswordResponse',
        properties: {
          "data": {type: 'object'},
          "status": {type: 'string'},
          "errorCode": {type: 'number'},
          "errorMessage": {type: 'string'}
        },
      },
    },
  },
};

export class ResetPasswordController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserManagementService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(MoongateUserRepository) protected userRepository: MoongateUserRepository,
    @inject(UserServiceBindings.USER_SERVICE)
    public userManagementService: UserManagementService,
    @inject(NotificationBindings.NotificationProvider)
    private readonly notifProvider: INotification,
    @inject(SendGridBindings.SEND_GRID_SERVICE)
    private sendGridService: SendgridService,
  ) { }


  @post('/resendVerificationEmail', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': MoongateUser,
            },
          },
        },
      },
    },
  })
  async resendVerificationEmail(
    @requestBody(ForgotPasswordRequestBody) newUserRequest: MoongateUser,
  ): Promise<MoongateUser> {
    const user = await this.userRepository.findOne({where: {email: newUserRequest.email}});
    if (!user) {
      throw new HttpErrors.NotFound("Please make sure your email is correct.");
    }

    /*const message: Notification = ({
      subject: "Activate User",
      body: `<div>
          <p>Hi, ${user.username}</p>
          <p>Weclome to Moongate!</p>
          <p>Please take a second to confirm ${user.email} as your email address</p>
          <p><a href="${process.env.API_URL}/acitveUser?token=${user.verificationToken}">Activations Link</a></p>
          <p>Once you do, you'll be able to opt-in to notifactions of activity and access other features that require a valid email address.</p>
          <p>Best Regards,</p>
          <p>Team Moongate</p>
      </div>`,
      receiver: {"to": [{"id": user.email}]},
      sentDate: new Date(),
      type: MessageType.Email,
    });

    await this.notifProvider.publish(message);*/
    const link = `${process.env.API_URL}/acitveUser?token=${user.verificationToken}`;
    const message: MailDataRequired = {
      subject: "Activate User",
      html: `<div>
          <p>Hi, ${user.username}</p>
          <p>Weclome to Moongate!</p>
          <p>Please take a second to confirm ${user.email} as your email address</p>
          <p><a href="${process.env.API_URL}/acitveUser?token=${user.verificationToken}">${link}</a></p>
          <p>Once you do, you'll be able to opt-in to notifactions of activity and access other features that require a valid email address.</p>
          <p>Best Regards,</p>
          <p>Team Moongate</p>
      </div>`,
      to: {email: user.email},
      from: process.env.SEND_FROM as string,
    };
    await this.sendGridService.send(message);

    return user;
  }

  @post('/forgotPassword')
  @response(200, ForgotPasswordResponse)
  async forgot(
    @requestBody(ForgotPasswordRequestBody) forgotPasswordRequest: MoongateUser,
  ): Promise<object> {

    const {email} = forgotPasswordRequest;
    const user = await this.userManagementService.requestPasswordReset(email);

    if (!user) {
      return {
        "data": '',
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "发送重置邮件失败"
      };
    }

    /*const message: Notification = new Notification({
      subject: "重置密码",
      body: `<div>
          <p>Hello, ${user.username}</p>
          <p style="color: red;">We received a request to reset the password for your account with email address: ${user.email}</p>
          <p>To reset your password click on the link provided below</p>
          <a href="${process.env.APPLICATION_URL}${process.env.PATH_RESET_PASSWORD}?token=${user.resetKey}">Reset your password link</a>
          <p>If you didn’t request to reset your password, please ignore this email or reset your password to protect your account.</p>
          <p>Thanks</p>
          <p>LoopBack'ers at Shoppy</p>
      </div>`,
      receiver: {"to": [{"id": user.email}]},
      sentDate: new Date(),
      type: MessageType.Email,
    });

    await this.notifProvider.publish(message);*/
    const link = `${process.env.APPLICATION_URL}${process.env.PATH_RESET_PASSWORD}?token=${user.resetKey}`;
    const message: MailDataRequired = {
      subject: "Reset Password",
      html: `<div>
        <p>Hello, ${user.username}</p>
        <p>We received a request to reset the password for your account with email address: ${user.email}</p>
        <p>To reset your password click on the link provided below</p>
        <a href="${process.env.APPLICATION_URL}${process.env.PATH_RESET_PASSWORD}?token=${user.resetKey}">${link}</a>
        <p>If you didn’t request to reset your password, please ignore this email or reset your password to protect your account.</p>
        <p>Thanks</p>
        <p>Team Moongate</p>
      </div>`,
      to: {email: user.email},
      from: process.env.SEND_FROM as string,
    };
    await this.sendGridService.send(message);

    return {
      "data": `一封邮件已发送到您的邮箱${user.email}`,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @post('/resetPassword', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string'
                },
                data: {
                  type: 'object',
                },
                errorCode: {
                  type: 'string'
                },
                errorMessage: {
                  type: 'string'
                }
              },
            },
          },
        },
      },
    },
  })
  async resetPassword(
    @requestBody(ResetPasswordRequestBody) resetPassword: ResetPassword,
  ): Promise<any> {
    let result = undefined;

    const user = await this.userRepository.findOne({where: {resetKey: resetPassword.token}});
    if (!user) {
      return {
        "data": "",
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "invalid token provided."
      };
    }

    const validatedUser = await this.userManagementService.validateResetKeyLifeSpan(user);

    const password = await hash(resetPassword.password, await genSalt());
    const updateResult = await this.userRepository.userCredentials(validatedUser.id).patch({password});
    await this.userRepository.updateById(validatedUser.id, validatedUser);

    if (updateResult && updateResult.count > 0) {
      return {
        "data": _.pick(validatedUser, 'username', 'email'),
        "status": Status.SUCCESS.toString(),
        "errorCode": "",
        "errorMessage": ""
      }
    }
    else {
      return {
        "data": _.pick(validatedUser, 'username', 'email'),
        "status": Status.FAILED.toString(),
        "errorCode": "500",
        "errorMessage": "reset password failed"
      }
    }
  }
}

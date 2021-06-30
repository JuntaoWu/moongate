// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-todo-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials, TokenServiceBindings, UserRepository,
  UserServiceBindings
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {model, property, repository} from '@loopback/repository';
import {
  get, HttpErrors, param, post,
  requestBody, Response, RestBindings,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {MailDataRequired} from '@sendgrid/mail';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {INotification, NotificationBindings} from 'loopback4-notifications';
import {v4 as uuidv4} from 'uuid';
import {Status} from '../constant';
import {Investment, MoongateUser} from '../models';
import {InvestmentRepository} from '../repositories';
import {SendGridBindings, SendgridService} from '../services';
import {UserManagementService} from '../services/user-management.service';

@model()
export class NewUserRequest extends MoongateUser {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
    password: {
      type: 'string',
      minLength: 6,
    },
    walletAddress: {
      type: 'string',
    }
  },
};

export const CredentialsRequestBody = {
  description: 'The input of signup/login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

export class UserController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userManagementService: UserManagementService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: UserManagementService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
    @inject(NotificationBindings.NotificationProvider)
    private readonly notifProvider: INotification,
    @repository(InvestmentRepository) protected investmentRepository: InvestmentRepository,
    @inject(SendGridBindings.SEND_GRID_SERVICE)
    private sendGridService: SendgridService,
  ) { }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                "data": {type: 'object'},
                "status": {type: 'string'},
                "errorCode": {type: 'number'},
                "errorMessage": {type: 'string'}
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<any> {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);
    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);
    return {
      "data": {token},
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };

  }

  @authenticate('jwt')
  @get('/whoAmI', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                "data": {type: 'object'},
                "status": {type: 'string'},
                "errorCode": {type: 'number'},
                "errorMessage": {type: 'string'}
              }
            },
          },
        },
      },
    },
  })
  async whoAmI(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<any> {
    return {
      data: {userId: currentUserProfile[securityId], username: currentUserProfile.name},
      status: Status.SUCCESS.toString(),
      errorCode: "",
      errorMessage: ""
    };
  }

  @post('/signup', {
    responses: {
      '200': {
        description: 'User',
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
  async signUp(
    @requestBody(CredentialsRequestBody) newUserRequest: NewUserRequest,
  ): Promise<any> {
    const existingUser = await this.userRepository.findOne({where: {email: newUserRequest.email}});
    if (existingUser) {
      if (existingUser.emailVerified) {
        return {
          "data": "",
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "用户已存在，是否忘记密码？"
        };
      } else {
        return {
          "data": "",
          "status": Status.WARRING.toString(),
          "errorCode": "400",
          "errorMessage": "用户已存在，请检查邮箱激活邮件"
        };
      }
    }

    newUserRequest.emailVerified = false;
    newUserRequest.verificationToken = uuidv4();
    const password = await hash(newUserRequest.password, await genSalt());
    const savedUser = await this.userRepository.create(
      _.pick(newUserRequest, 'email', 'emailVerified', 'verificationToken', 'walletAddress'),
    );

    await this.userRepository.userCredentials(savedUser.id).create({password});

    // const message: Notification = new Notification({
    //   subject: "Activate User",
    //   body: `<div>
    //       <p>Hi, ${savedUser.username}</p>
    //       <p>Weclome to Moongate!</p>
    //       <p>Please take a second to confirm ${savedUser.email} as your email address</p>
    //       <p><a href="${process.env.API_URL}/acitveUser?token=${savedUser.verificationToken}">Activations Link</a></p>
    //       <p>Once you do, you'll be able to opt-in to notifactions of activity and access other features that require a valid email address.</p>
    //       <p>Best Regards,</p>
    //       <p>Team Moongate</p>
    //   </div>`,
    //   receiver: {"to": [{"id": savedUser.email}]},
    //   sentDate: new Date(),
    //   type: MessageType.Email,
    // });

    // await this.notifProvider.publish(message);

    const message: MailDataRequired = {
      subject: "Activate User",
      html: `<div>
          <p>Hi, ${savedUser.username}</p>
          <p>Weclome to Moongate!</p>
          <p>Please take a second to confirm ${savedUser.email} as your email address</p>
          <p><a href="${process.env.API_URL}/acitveUser?token=${savedUser.verificationToken}">Activations Link</a></p>
          <p>Once you do, you'll be able to opt-in to notifactions of activity and access other features that require a valid email address.</p>
          <p>Best Regards,</p>
          <p>Team Moongate</p>
      </div>`,
      to: {email: savedUser.email},
      from: 'support@moongate.investments',
    };

    await this.sendGridService.send(message);

    return {
      "data": savedUser,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }


  @get('/acitveUser', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async activeUser(
    @param.query.string('token') token: string,
    @inject(RestBindings.Http.RESPONSE) res: Response

  ): Promise<any> {
    const user = await this.userRepository.findOne({where: {"verificationToken": token}, });
    if (!user) {
      throw new HttpErrors.NotFound(`current customer don't exist`);
    }
    if (user && user.emailVerified) {
      return res.redirect(`${process.env.APPLICATION_URL}${process.env.PATH_REDIRECT}` as string);
    }
    else {
      await this.userRepository.updateById(user.id, {emailVerified: true});
      await this.investmentRepository.create(new Investment({
        userId: user.id,
        purchasedTotal: 0,
        releasedTotal: 0,
        lockedTotal: 0
      }));
      return res.redirect(`${process.env.APPLICATION_URL}${process.env.PATH_REDIRECT}` as string);
    }
  }

}

// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-todo-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials, TokenServiceBindings,
  User,
  UserRepository,
  UserServiceBindings
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {hasMany, hasOne, model, property, repository} from '@loopback/repository';
import {
  get, HttpErrors, param, post,
  requestBody, Response, RestBindings,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {INotification, MessageType, NotificationBindings} from 'loopback4-notifications';
import {v4 as uuidv4} from 'uuid';
import {Investment, Notification, TransactionHistory} from '../models';
import {UserManagementService} from '../services/user-management.service';

@model()
export class NewUserRequest extends User {
  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @hasMany(() => TransactionHistory)
  transactionHistories: TransactionHistory[];

  @hasOne(() => Investment)
  investment: Investment;
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
                token: {
                  type: 'string',
                },
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
    return {token};

  }

  @authenticate('jwt')
  @get('/whoAmI', {
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
  async whoAmI(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<string> {
    return currentUserProfile[securityId];
  }

  @post('/signup', {
    responses: {
      '200': {
        description: 'User',
        content: {
          'application/json': {
            schema: {
              'x-ts-type': User,
            },
          },
        },
      },
    },
  })
  async signUp(
    @requestBody(CredentialsRequestBody) newUserRequest: NewUserRequest,
  ): Promise<User> {
    newUserRequest.username = newUserRequest.email;
    newUserRequest.emailVerified = false;
    newUserRequest.verificationToken = uuidv4();
    const password = await hash(newUserRequest.password, await genSalt());
    const savedUser = await this.userRepository.create(
      _.pick(newUserRequest, 'email', 'username', 'emailVerified', 'verificationToken'),
    );

    await this.userRepository.userCredentials(savedUser.id).create({password});

    const message: Notification = new Notification({
      subject: "Activate User",
      body: `<div>
          <p>Hi, ${savedUser.email}</p>
          <p>Weclome to Moongate!</p>
          <p>Please take a second to confirm ${savedUser.email} as your email address</p>
          <p><a href="${process.env.API_URL}/acitveUser?token=${savedUser.verificationToken}">Activations Link</a></p>
          <p>Once you do, you'll be able to opt-in to notifactions of activity and access other features that require a valid email address.</p>
          <p>Best Regards,</p>
          <p>Team Moongate</p>
      </div>`,
      receiver: {"to": [{"id": savedUser.email}]},
      sentDate: new Date(),
      type: MessageType.Email,
    });

    await this.notifProvider.publish(message);

    return savedUser;
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
      return res.redirect(process.env.REDIRECT_URL as string);
    }
    else {
      await this.userRepository.updateById(user.id, {emailVerified: true});
      return res.redirect(process.env.REDIRECT_URL as string);
    }
  }

}

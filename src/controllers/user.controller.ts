// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-todo-jwt
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {authenticate, TokenService} from '@loopback/authentication';
import {
  Credentials,
  MyUserService,


  TokenServiceBindings,
  User,
  UserRepository,
  UserServiceBindings
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {model, property, repository} from '@loopback/repository';
import {
  get,
  post,
  requestBody,
  response,
  ResponseObject,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import _ from 'lodash';
import {INotification, MessageType, NotificationBindings} from 'loopback4-notifications';
import {Notification} from '../models';
import {UserManagementService} from '../services/user-management';

@model()
export class NewUserRequest extends User {
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
  },
};

export const CredentialsRequestBody = {
  description: 'The input of signup/login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
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
          error: {type: 'boolean'},
          message: {type: 'string'}
        },
      },
    },
  },
};

export class UserController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    public userManagementService: UserManagementService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
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
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{token: string}> {
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
    const password = await hash(newUserRequest.password, await genSalt());
    const savedUser = await this.userRepository.create(
      _.pick(newUserRequest, 'email', 'username'),
    );

    await this.userRepository.userCredentials(savedUser.id).create({password});

    return savedUser;
  }

  @post('/forgotPassword')
  @response(200, ForgotPasswordResponse)
  async forgot(
    @requestBody(ForgotPasswordRequestBody) forgotPasswordRequest: User,
  ): Promise<object> {

    const {email} = forgotPasswordRequest;
    const user = await this.userManagementService.requestPasswordReset(email);

    const message: Notification = new Notification({
      subject: "重置密码",
      body: `请重置密码follow by link: ${user.resetKey}`,
      receiver: {"to": [{"id": user.email}]},
      sentDate: new Date(),
      type: MessageType.Email,
    });

    await this.notifProvider.publish(message);

    return {
      error: false,
      message: `一封邮件已发送到您的邮箱${user.email}`
    };
  }
}

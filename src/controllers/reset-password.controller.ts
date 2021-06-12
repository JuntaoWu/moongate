import {TokenService} from '@loopback/authentication';
import {MyUserService, TokenServiceBindings, UserRepository, UserServiceBindings} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {post, requestBody, SchemaObject} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {genSalt, hash} from 'bcryptjs';
import {Status} from '../constant';
import {ResetPassword} from '../models';


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

export class ResetPasswordController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
  ) { }

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
    const tokenResult = await this.jwtService.verifyToken(resetPassword.token);
    const password = await hash(resetPassword.password, await genSalt());
    const updateResult = await this.userRepository.userCredentials(tokenResult.id).patch({password});

    if (updateResult && updateResult.count > 0) {
      return {
        "data": tokenResult,
        "status": Status.SUCCESS,
        "errorCode": "",
        "errorMessage": ""
      }
    }
    else {
      return {
        "data": tokenResult,
        "status": Status.FAILED,
        "errorCode": "500",
        "errorMessage": "reset password failure"
      }
    }
  }
}

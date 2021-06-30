import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {
  CountSchema,
  Filter, model,
  property,
  repository,
  Where
} from '@loopback/repository';
import {
  get,
  getModelSchemaRef, param, patch, post, requestBody,
  response
} from '@loopback/rest';
import {genSalt, hash} from 'bcryptjs';
import * as _ from 'lodash';
import {Status} from '../constant';
import {Investment, MoongateUser} from '../models';
import {InvestmentRepository, MoongateUserRepository} from '../repositories';

@model()
class NewMoongateUserRequest extends MoongateUser {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

@authorize({allowedRoles: ['admin']})
export class ManagementUserController {
  constructor(
    @repository(MoongateUserRepository)
    public moongateUserRepository: MoongateUserRepository,
    @repository(InvestmentRepository)
    public investmentRepository: InvestmentRepository,
  ) { }

  @authenticate('jwt')
  @post('/management-user')
  @response(200, {
    description: 'MoongateUser model instance',
    content: {'application/json': {schema: getModelSchemaRef(MoongateUser)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewMoongateUserRequest, {
            title: 'NewMoongateUser',
            exclude: ['id', 'realm', 'username', 'emailVerified', 'verificationToken', 'userCredentials', 'locked', 'createdAt', 'updatedAt'],
            includeRelations: false,
          }),
        },
      },
    })
    moongateUser: Omit<NewMoongateUserRequest, 'id'>,
  ): Promise<object> {
    const existingUser = await this.moongateUserRepository.findOne({where: {email: moongateUser.email}});
    if (existingUser) {
      if (existingUser.emailVerified) {
        return {
          "data": "",
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "该用户已存在"
        };
      } else {
        return {
          "data": "",
          "status": Status.WARRING.toString(),
          "errorCode": "400",
          "errorMessage": "该用户已存在, 但用户未确认激活邮件"
        };
      }
    }

    moongateUser.emailVerified = true;

    const password = await hash(moongateUser.password, await genSalt());
    const savedUser = await this.moongateUserRepository.create(
      _.pick(moongateUser, 'email', 'emailVerified', 'walletAddress'),
    );

    await this.moongateUserRepository.userCredentials(savedUser.id).create({password});

    await this.investmentRepository.create(new Investment({
      userId: savedUser.id,
      purchasedTotal: 0,
      releasedTotal: 0,
      lockedTotal: 0
    }));

    return {
      "data": savedUser,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @authenticate('jwt')
  @get('/management-user/count')
  @response(200, {
    description: 'MoongateUser model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(MoongateUser) where?: Where<MoongateUser>,
  ): Promise<object> {
    const count = await this.moongateUserRepository.count({...where});
    return {
      "data": count,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @authenticate('jwt')
  @get('/management-user')
  @response(200, {
    description: 'Array of MoongateUser model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(MoongateUser, {includeRelations: false}),
        },
      },
    },
  })
  async find(
    @param.filter(MoongateUser, {
      exclude: ['include', 'offset'],
    }) filter?: Filter<MoongateUser>,
  ): Promise<object> {
    return {
      "data": await this.moongateUserRepository.find(filter),
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @authenticate('jwt')
  @get('/management-user/{id}')
  @response(200, {
    description: 'MoongateUser model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(MoongateUser, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string
  ): Promise<object> {
    return {
      "data": await this.moongateUserRepository.findById(id),
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @authenticate('jwt')
  @patch('/management-user/{id}')
  @response(204, {
    description: 'MoongateUser PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(NewMoongateUserRequest, {
            partial: true,
            exclude: ['id', 'realm', 'username', 'verificationToken', 'userCredentials', 'createdAt', 'updatedAt']
          }),
        },
      },
    })
    moongateUser: NewMoongateUserRequest,
  ): Promise<void> {
    if (moongateUser.password) {
      const password = await hash(moongateUser.password, await genSalt());
      await this.moongateUserRepository.userCredentials(id).create({password});
    }

    await this.moongateUserRepository.updateById(id, _.omit(moongateUser, 'roles'));
  }

  // @del('/management-user/{id}')
  // @response(204, {
  //   description: 'MoongateUser DELETE success',
  // })
  // async deleteById(@param.path.string('id') id: string): Promise<void> {
  //   await this.moongateUserRepository.deleteById(id);
  // }
}

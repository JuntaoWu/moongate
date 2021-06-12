import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
} from '@loopback/repository';
import {
  del, get,
  getModelSchemaRef, param,


  patch, post,




  put,

  requestBody,
  response
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {TransactionHistory, TransactionHistoryWithRelations} from '../models';
import {TransactionHistoryRepository} from '../repositories';

export class TransactionHistoryController {
  constructor(
    @repository(TransactionHistoryRepository)
    public transactionHistoryRepository: TransactionHistoryRepository,
  ) { }

  @authenticate('jwt')
  @post('/transaction-histories')
  @response(200, {
    description: 'TransactionHistory model instance',
    content: {'application/json': {schema: getModelSchemaRef(TransactionHistory)}},
  })
  async create(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(TransactionHistory, {
            title: 'NewTransactionHistory',
            exclude: ['id'],
          }),
        },
      },
    })
    transactionHistory: Omit<TransactionHistory, 'id'>,
  ): Promise<TransactionHistory> {
    transactionHistory.userId = currentUserProfile[securityId];
    return this.transactionHistoryRepository.create(transactionHistory);
  }

  @authenticate('jwt')
  @get('/transaction-histories/count')
  @response(200, {
    description: 'TransactionHistory model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.where(TransactionHistory) where?: Where<TransactionHistory>,
  ): Promise<Count> {
    return this.transactionHistoryRepository.count({...where, userId: currentUserProfile[securityId]});
  }

  @authenticate('jwt')
  @get('/transaction-histories')
  @response(200, {
    description: 'Array of TransactionHistory model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(TransactionHistory, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.filter(TransactionHistory) filter?: Filter<TransactionHistory>,
  ): Promise<(TransactionHistoryWithRelations | undefined)[]> {
    return (await this.transactionHistoryRepository
      .find({
        ...filter,
        where: {userId: currentUserProfile[securityId]},
        include: ['user']
      }))
      .map(value => {
        return {...value, user: value.user, amount: value.amount.toString()} as any;
      });
  }

  @patch('/transaction-histories')
  @response(200, {
    description: 'TransactionHistory PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(TransactionHistory, {partial: true}),
        },
      },
    })
    transactionHistory: TransactionHistory,
    @param.where(TransactionHistory) where?: Where<TransactionHistory>,
  ): Promise<Count> {
    return this.transactionHistoryRepository.updateAll(transactionHistory, where);
  }

  @get('/transaction-histories/{id}')
  @response(200, {
    description: 'TransactionHistory model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(TransactionHistory, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(TransactionHistory, {exclude: 'where'}) filter?: FilterExcludingWhere<TransactionHistory>
  ): Promise<TransactionHistory> {
    return this.transactionHistoryRepository.findById(id, filter);
  }

  @patch('/transaction-histories/{id}')
  @response(204, {
    description: 'TransactionHistory PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(TransactionHistory, {partial: true}),
        },
      },
    })
    transactionHistory: TransactionHistory,
  ): Promise<void> {
    await this.transactionHistoryRepository.updateById(id, transactionHistory);
  }

  @put('/transaction-histories/{id}')
  @response(204, {
    description: 'TransactionHistory PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() transactionHistory: TransactionHistory,
  ): Promise<void> {
    await this.transactionHistoryRepository.replaceById(id, transactionHistory);
  }

  @del('/transaction-histories/{id}')
  @response(204, {
    description: 'TransactionHistory DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.transactionHistoryRepository.deleteById(id);
  }
}

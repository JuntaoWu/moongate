// Uncomment these imports to begin using these cool features!

import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, getModelSchemaRef, response} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {Investment} from '../models';
import {InvestmentRepository} from '../repositories';

// import {inject} from '@loopback/core';


export class InvestmentController {
  constructor(
    @repository(InvestmentRepository)
    public investmentRepository: InvestmentRepository,
  ) { }

  @authenticate('jwt')
  @get('/investments')
  @response(200, {
    description: 'Array of TransactionHistory model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Investment, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile
  ): Promise<(Investment)> {
    const investmentResult = await this.investmentRepository
      .findOne({
        where: {userId: currentUserProfile[securityId]}
      })
    if (investmentResult) {
      return {
        ...investmentResult,
        purchasedTotal: investmentResult.purchasedTotal.toString(),
        releasedTotal: investmentResult.releasedTotal.toString(),
        lockedTotal: investmentResult.lockedTotal.toString()
      } as any
    }
    else {
      return {
        purchasedTotal: 0,
        releasedTotal: 0,
        lockedTotal: 0
      } as Investment
    }

  }
}

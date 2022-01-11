// Uncomment these imports to begin using these cool features!

import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {get, response} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {Status, TransferStatus} from '../constant';
import {InvestmentRepository, TransferRepository} from '../repositories';

// import {inject} from '@loopback/core';

export class InvestmentController {
  constructor(
    @repository(InvestmentRepository)
    public investmentRepository: InvestmentRepository,
    @repository(TransferRepository)
    public transferRepository: TransferRepository,
  ) { }

  @authenticate('jwt')
  @get('/investments')
  @response(200, {
    description: 'Array of TransactionHistory model instances',
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
      }
    },
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile
  ): Promise<any> {
    const investmentResult = await this.investmentRepository
      .findOne({
        where: {userId: currentUserProfile[securityId]}
      })
    if (investmentResult) {
      const pendingTransfers = await this.transferRepository.find({where: {userId: currentUserProfile[securityId], status: TransferStatus.PENDING}});
      let pendingAmount = 0;
      pendingTransfers?.forEach(item => {
        pendingAmount = pendingAmount + parseFloat(item.amount.toString());
      });
      const result = {
        ...investmentResult,
        purchasedTotal: parseFloat(investmentResult.purchasedTotal.toString()) - pendingAmount,
        releasedTotal: parseFloat(investmentResult.releasedTotal.toString()),
        lockedTotal: parseFloat(investmentResult.lockedTotal.toString()) - pendingAmount
      };
      return {
        "data": result,
        "status": Status.SUCCESS.toString(),
        "errorCode": "",
        "errorMessage": ""
      }
    }
    else {
      const result = {
        purchasedTotal: 0,
        releasedTotal: 0,
        lockedTotal: 0
      }
      return {
        "data": result,
        "status": Status.SUCCESS.toString(),
        "errorCode": "",
        "errorMessage": ""
      }
    }

  }
}

import {authenticate} from '@loopback/authentication';
import {UserRepository} from '@loopback/authentication-jwt';
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
  getModelSchemaRef, HttpErrors, param, patch, post, put, requestBody,
  response, Response, RestBindings,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {INotification, MessageType, NotificationBindings} from 'loopback4-notifications';
import moment from 'moment';
import {Status, TransactionActivey, TransferStatus} from '../constant';
import {Notification, TransactionHistory, Transfer, TransferRequest} from '../models';
import {InvestmentRepository, TransactionHistoryRepository, TransferRepository} from '../repositories';

const CreateTransferSchema: SchemaObject = {
  type: 'object',
  required: ['email', 'amount'],
  properties: {
    receiver: {
      type: 'string',
    },
    amount: {
      type: 'number'
    }
  }
};

export const CreateTransferRequestBody = {
  description: 'The input of createTransfer function',
  require: true,
  content: {
    'application/json': {schema: CreateTransferSchema},
  }
};

export class TransferController {
  constructor(
    @repository(TransferRepository)
    public transferRepository: TransferRepository,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
    @inject(NotificationBindings.NotificationProvider)
    private readonly notifProvider: INotification,
    @repository(InvestmentRepository)
    public investmentRepository: InvestmentRepository,
    @repository(TransactionHistoryRepository)
    public transactionHistoryRepository: TransactionHistoryRepository
  ) { }

  @authenticate('jwt')
  @post('/transfer')
  @response(200, {
    description: 'Transfer model instance',
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
      }
    },
  })
  async create(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody(CreateTransferRequestBody) transferRequset: TransferRequest,
  ): Promise<any> {
    const investmentResult = await this.investmentRepository
      .findOne({
        where: {userId: currentUserProfile[securityId]}
      })

    const availableAmount = investmentResult && investmentResult.lockedTotal && investmentResult.lockedTotal.toString();

    if (!investmentResult || !availableAmount) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current user don't have any investment record"
      }
    }
    if ((parseFloat(availableAmount) - transferRequset.amount) < 0) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current user locked amount less than transfer amount"
      }
    }

    const targetUser = await this.userRepository.findOne({where: {username: transferRequset.receiver}});
    if (!targetUser) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current target user doesn't exist"
      }
    }

    if (!targetUser.emailVerified) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current target user isn't active"
      }
    }

    let transfer = new Transfer();
    transfer.userId = currentUserProfile[securityId];
    transfer.receiver = transferRequset.receiver;
    transfer.amount = transferRequset.amount;
    transfer.date = new Date();
    transfer.status = TransferStatus.PENDING;
    const result = await this.transferRepository.create(transfer);

    const currentUser = await this.userRepository.findOne({where: {id: currentUserProfile[securityId]}})
    if (currentUser) {
      const message: Notification = new Notification({
        subject: "Activate Transfer",
        body: `<div>
            <p>Hi, ${currentUser.username}</p>
            <p>Confirmation of transfer application</p>
            <p>Your Moongate account applies to transfer ${transferRequset.amount} to</p>
            <p>${targetUser.username}</p>
            <p>Please verify the recipient's user ID verbatim. If you did make this request, please confirm the transfer:</p>
            <p><a href="${process.env.API_URL}/acitveTransfer?transferId=${result.id}">Activations Link</a></p>
            <p>If it is not your own operation, simply ignore this email.</p>
            <p>Best Regards,</p>
            <p>Team Moongate</p>
        </div>`,
        receiver: {"to": [{"id": currentUser.email}]},
        sentDate: new Date(),
        type: MessageType.Email,
      });

      await this.notifProvider.publish(message);
    }
    return {
      "data": result,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    }
  }

  @authenticate('jwt')
  @get('/transfer/count')
  @response(200, {
    description: 'Transfer model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.where(Transfer) where?: Where<Transfer>,
  ): Promise<Count> {
    return this.transferRepository.count({...where, userId: currentUserProfile[securityId]});
  }

  @authenticate('jwt')
  @get('/transfer')
  @response(200, {
    description: 'Array of Transfer model instances',
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
  })
  async find(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.filter(Transfer) filter?: Filter<Transfer>,
  ): Promise<any> {
    const result = (await this.transferRepository
      .find({
        ...filter,
        where: {userId: currentUserProfile[securityId]}
      }))
      .map(value => {
        return {...value, amount: value.amount.toString()} as any;
      });
    return {
      "data": result,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    }
  }

  @patch('/transfer')
  @response(200, {
    description: 'Transfer PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Transfer, {partial: true}),
        },
      },
    })
    transfer: Transfer,
    @param.where(Transfer) where?: Where<Transfer>,
  ): Promise<Count> {
    return this.transferRepository.updateAll(transfer, where);
  }

  @get('/transfer/{id}')
  @response(200, {
    description: 'Transfer model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Transfer, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Transfer, {exclude: 'where'}) filter?: FilterExcludingWhere<Transfer>
  ): Promise<Transfer> {
    return this.transferRepository.findById(id, filter);
  }

  @patch('/transfer/{id}')
  @response(204, {
    description: 'Transfer PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Transfer, {partial: true}),
        },
      },
    })
    transfer: Transfer,
  ): Promise<void> {
    await this.transferRepository.updateById(id, transfer);
  }

  @put('/transfer/{id}')
  @response(204, {
    description: 'Transfer PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() transfer: Transfer,
  ): Promise<void> {
    await this.transferRepository.replaceById(id, transfer);
  }

  @del('/transfer/{id}')
  @response(204, {
    description: 'Transfer DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.transferRepository.deleteById(id);
  }


  @get('/acitveTransfer', {
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
  async acitveTransfer(
    @param.query.string('transferId') transferId: string,
    @inject(RestBindings.Http.RESPONSE) res: Response

  ): Promise<any> {
    try {
      const transfer = await this.transferRepository.findOne({where: {id: transferId}, });

      if (!transfer) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current transfer doesn't exist"
        }
      }
      if (transfer && transfer.status === TransferStatus.DONE) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current transfer alreay completed,can't transfer again"
        }
      }
      else {
        let originalPurchasedTotal = undefined;
        let currentPurchasedTotal = undefined;
        let originalLockedTotal = undefined;
        let currentLockedTotal = undefined
        let transactionHistoryModel = undefined;

        const transferAmount = transfer.amount.toString();

        /**get current user information */
        const currentUser = await this.userRepository.findOne({where: {id: transfer.userId}});
        if (currentUser) {
          /**update current user investment */
          const currentInvestment = await this.investmentRepository.findOne({where: {userId: transfer.userId}});
          if (currentInvestment) {
            originalPurchasedTotal = currentInvestment.purchasedTotal.toString();
            currentPurchasedTotal = parseFloat(originalPurchasedTotal) - parseFloat(transferAmount)

            originalLockedTotal = currentInvestment.lockedTotal.toString();
            currentLockedTotal = parseFloat(originalLockedTotal) - parseFloat(transferAmount)

            await this.investmentRepository.updateById(currentInvestment.id, {
              purchasedTotal: currentPurchasedTotal,
              lockedTotal: currentLockedTotal
            })
          }

          /**insert transfer record to transaction history */
          transactionHistoryModel = new TransactionHistory();
          transactionHistoryModel.userId = transfer.userId;
          transactionHistoryModel.activity = TransactionActivey.TRNASFER;
          transactionHistoryModel.amount = -parseFloat(transferAmount);
          transactionHistoryModel.date = new Date()
          await this.transactionHistoryRepository.create(transactionHistoryModel);
        }

        /**get target user information */
        const targetUser = await this.userRepository.findOne({where: {username: transfer.receiver}});
        if (targetUser) {

          /**update target user investment */
          const targetInvestment = await this.investmentRepository.findOne({where: {userId: targetUser.id}});
          if (targetInvestment) {
            originalPurchasedTotal = targetInvestment.purchasedTotal.toString();
            currentPurchasedTotal = parseFloat(originalPurchasedTotal) + parseFloat(transferAmount);

            originalLockedTotal = targetInvestment.lockedTotal.toString();
            currentLockedTotal = parseFloat(originalLockedTotal) + parseFloat(transferAmount);

            await this.investmentRepository.updateById(targetInvestment.id, {
              purchasedTotal: currentPurchasedTotal,
              lockedTotal: currentLockedTotal
            });
          }

          /**insert transfer record to transaction history */
          transactionHistoryModel = new TransactionHistory();
          transactionHistoryModel.userId = targetUser.id;
          transactionHistoryModel.activity = TransactionActivey.TRNASFER;
          transactionHistoryModel.amount = parseFloat(transferAmount);
          transactionHistoryModel.date = new Date()
          await this.transactionHistoryRepository.create(transactionHistoryModel);
        }

        /**update transfer status from pending to done */
        await this.transferRepository.updateById(transferId, {status: TransferStatus.DONE});

        /**send email */
        if (currentUser && targetUser) {
          const currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss")
          const message: Notification = new Notification({
            subject: "Transfer successfully",
            body: `<div>
                <p>Hi, ${currentUser.username}</p>
                <p>Transfer successfully</p>
                <p>Your Moongate account has successfully transferred ${transfer?.amount} T on ${currentDateTime}. The recipient's user ID is ${targetUser.username}</p>
                <p>This is a system email, please do not reply.</p>
                <p>Best Regards,</p>
                <p>Team Moongate</p>
            </div>`,
            receiver: {"to": [{"id": currentUser.email}]},
            sentDate: new Date(),
            type: MessageType.Email,
          });

          await this.notifProvider.publish(message);
        }

        return res.redirect(`${process.env.APPLICATION_URL}${process.env.PATH_TRANSFER}` as string);
      }
    }
    catch (e) {
      throw new HttpErrors.InternalServerError(e);
    }
  }

  @get('/cancelTransfer', {
    responses: {
      '200': {
        description: 'Return current transfer',
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
  async cancelTransfer(
    @param.query.string('transferId') transferId: string,
    @inject(RestBindings.Http.RESPONSE) res: Response

  ): Promise<any> {
    try {
      const transfer = await this.transferRepository.findOne({where: {id: transferId}, });

      if (!transfer) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current transfer doesn't exist"
        }
      }
      if (transfer && transfer.status === TransferStatus.DONE) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current transfer alreay completed,can't cancel again"
        }
      }
      else {
        /**get current user information */
        const currentUser = await this.userRepository.findOne({where: {id: transfer.userId}});

        /**get target user information */
        const targetUser = await this.userRepository.findOne({where: {username: transfer.receiver}});


        /**update transfer status from pending to done */
        await this.transferRepository.updateById(transferId, {status: TransferStatus.CANCELLED});

        const latestTransfer = await this.transferRepository.findOne({where: {id: transferId}, });

        /**send email */
        if (currentUser && targetUser) {
          const message: Notification = new Notification({
            subject: "Transfer cancelled",
            body: `<div>
                <p>Hi, ${currentUser.username}</p>
                <p>Transfer cancelled</p>
                <p>Your transfer to the user ${targetUser.username} has been successfully cancelled.</p>
                <p>This is a system email, please do not reply.</p>
                <p>Best Regards,</p>
                <p>Team Moongate</p>
            </div>`,
            receiver: {"to": [{"id": currentUser.email}]},
            sentDate: new Date(),
            type: MessageType.Email,
          });

          await this.notifProvider.publish(message);
        }

        return {
          "data": latestTransfer,
          "status": Status.SUCCESS.toString(),
          "errorCode": "",
          "errorMessage": ""
        }
      }
    }
    catch (e) {
      throw new HttpErrors.InternalServerError(e);
    }
  }

}

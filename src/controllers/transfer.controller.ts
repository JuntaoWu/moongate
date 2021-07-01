import {authenticate} from '@loopback/authentication';
import {UserRepository} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {
  CountSchema,
  Filter, repository,
  Where
} from '@loopback/repository';
import {
  del,
  get, HttpErrors, param, post, requestBody,
  response, Response, RestBindings,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {MailDataRequired} from '@sendgrid/mail';
import {INotification, NotificationBindings} from 'loopback4-notifications';
import moment from 'moment';
import {Status, TransactionActivey, TransactionStatus, TransferStatus} from '../constant';
import {TransactionHistory, Transfer, TransferRequest} from '../models';
import {InvestmentRepository, TransactionHistoryRepository, TransferRepository} from '../repositories';
import {SendGridBindings, SendgridService} from '../services';

const CreateTransferSchema: SchemaObject = {
  type: 'object',
  required: ['receiver', 'amount'],
  properties: {
    receiver: {
      type: 'string',
      description: '目标username',
      example: 'User123456'
    },
    amount: {
      type: 'number',
      description: '转账金额',
      example: '1.23'
    },
  }
};

export const CreateTransferRequestBody = {
  description: 'The input of createTransfer function',
  require: true,
  content: {
    'application/json': {schema: CreateTransferSchema},
  }
};

const AdminCreateTransferSchema: SchemaObject = {
  type: 'object',
  required: ['sender', 'receiver', 'amount'],
  properties: {
    sender: {
      type: 'string',
      description: '发送username',
      example: 'User123456'
    },
    receiver: {
      type: 'string',
      description: '目标username',
      example: 'User123456'
    },
    amount: {
      type: 'number',
      description: '转账金额',
      example: '1.23'
    }
  }
};

export const AdminCreateTransferRequestBody = {
  description: 'The input of createTransfer function',
  require: true,
  content: {
    'application/json': {schema: AdminCreateTransferSchema},
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
    public transactionHistoryRepository: TransactionHistoryRepository,
    @inject(SendGridBindings.SEND_GRID_SERVICE)
    private sendGridService: SendgridService
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

    const currentUser = await this.userRepository.findOne({where: {id: currentUserProfile[securityId]}})

    if (currentUser) {
      let transfer = new Transfer();
      transfer.userId = currentUserProfile[securityId];
      transfer.sender = currentUser.username as any;
      transfer.receiver = transferRequset.receiver;
      transfer.amount = transferRequset.amount;
      transfer.createDate = new Date();
      transfer.status = TransferStatus.PENDING;
      const result = await this.transferRepository.create(transfer);
      /*const message: Notification = new Notification({
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
      await this.notifProvider.publish(message);*/
      const message: MailDataRequired = {
        subject: "Activate Transfer",
        html: `<div>
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
        to: {email: currentUser.email},
        from: 'support@moongate.investments',
      };
      await this.sendGridService.send(message);
      return {
        "data": result,
        "status": Status.SUCCESS.toString(),
        "errorCode": "",
        "errorMessage": ""
      }
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
  ): Promise<any> {
    const count = await this.transferRepository.count({...where, userId: currentUserProfile[securityId]});
    return {
      "data": count,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
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
    @param.filter(Transfer, {
      exclude: ['include', 'where', 'offset', 'fields']
    }) filter?: Filter<Transfer>,
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

  // @patch('/transfer')
  // @response(200, {
  //   description: 'Transfer PATCH success count',
  //   content: {'application/json': {schema: CountSchema}},
  // })
  // async updateAll(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transfer, {partial: true}),
  //       },
  //     },
  //   })
  //   transfer: Transfer,
  //   @param.where(Transfer) where?: Where<Transfer>,
  // ): Promise<Count> {
  //   return this.transferRepository.updateAll(transfer, where);
  // }

  // @get('/transfer/{id}')
  // @response(200, {
  //   description: 'Transfer model instance',
  //   content: {
  //     'application/json': {
  //       schema: getModelSchemaRef(Transfer, {includeRelations: true}),
  //     },
  //   },
  // })
  // async findById(
  //   @param.path.string('id') id: string,
  //   @param.filter(Transfer, {exclude: 'where'}) filter?: FilterExcludingWhere<Transfer>
  // ): Promise<Transfer> {
  //   return this.transferRepository.findById(id, filter);
  // }

  // @patch('/transfer/{id}')
  // @response(204, {
  //   description: 'Transfer PATCH success',
  // })
  // async updateById(
  //   @param.path.string('id') id: string,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Transfer, {partial: true}),
  //       },
  //     },
  //   })
  //   transfer: Transfer,
  // ): Promise<void> {
  //   await this.transferRepository.updateById(id, transfer);
  // }

  // @put('/transfer/{id}')
  // @response(204, {
  //   description: 'Transfer PUT success',
  // })
  // async replaceById(
  //   @param.path.string('id') id: string,
  //   @requestBody() transfer: Transfer,
  // ): Promise<void> {
  //   await this.transferRepository.replaceById(id, transfer);
  // }

  @authorize({allowedRoles: ['admin']})
  @authenticate('jwt')
  @del('/transfer/{id}')
  @response(204, {
    description: 'Transfer DELETE success',
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
        }
      }
    }
  })
  async deleteById(@param.path.string('id') id: string): Promise<any> {
    const selectTransfer = await this.transferRepository.findById(id);
    if (!selectTransfer) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current transfer isn't exist"
      }
    }

    if (selectTransfer.status === TransferStatus.DELETED) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current transfer already deleted"
      }
    }

    const senderUser = await this.userRepository.findOne({where: {username: selectTransfer.sender}});
    const receiverUser = await this.userRepository.findOne({where: {username: selectTransfer.receiver}});

    if (!senderUser) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "the sender user of current transfer isn't exist"
      }
    }

    if (!receiverUser) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "the receiver user of current transfer isn't exist"
      }
    }

    const senderInvestment = await this.investmentRepository.findOne({where: {userId: senderUser.id}});
    const receiverInvestment = await this.investmentRepository.findOne({where: {userId: receiverUser.id}});

    if (!senderInvestment) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "the sender user invsetment of current transfer isn't exist"
      }
    }

    if (!receiverInvestment) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "the receiver user invsetment of current transfer isn't exist"
      }
    }

    let currentPurchasedTotal = undefined;
    let currentLockedTotal = undefined
    let transferAmount = parseFloat(selectTransfer.amount.toString());

    /**update sender investment */
    currentPurchasedTotal = parseFloat(senderInvestment.purchasedTotal.toString()) + transferAmount;
    currentLockedTotal = parseFloat(senderInvestment.lockedTotal.toString()) + transferAmount;
    await this.investmentRepository.updateById(senderInvestment.id, {
      purchasedTotal: currentPurchasedTotal,
      lockedTotal: currentLockedTotal
    })

    /**update receiver investment */
    currentPurchasedTotal = parseFloat(receiverInvestment.purchasedTotal.toString()) - transferAmount;
    currentLockedTotal = parseFloat(receiverInvestment.lockedTotal.toString()) - transferAmount;
    await this.investmentRepository.updateById(receiverInvestment.id, {
      purchasedTotal: currentPurchasedTotal,
      lockedTotal: currentLockedTotal
    });

    /**set transaction history of current transfer status to Delete */
    const transactionHistories = await this.transactionHistoryRepository.find({where: {transferId: id}});
    if (transactionHistories) {
      const transactionHistoryIds = transactionHistories.map((item) => {return item.id});
      await this.transactionHistoryRepository.updateAll({status: TransactionStatus.DELETED}, {id: {inq: transactionHistoryIds}});
    }

    /**set the transfer status to Delete */
    await this.transferRepository.updateById(id, {status: TransferStatus.DELETED, updateDate: new Date()});

    return {
      "data": {},
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    }

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
      else if (transfer && transfer.status === TransferStatus.CANCELLED) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current transfer alreay cancel ,can't transfer again"
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
          transactionHistoryModel.status = TransactionStatus.ACTIVE;
          transactionHistoryModel.transferId = transferId;
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
          transactionHistoryModel.date = new Date();
          transactionHistoryModel.status = TransactionStatus.ACTIVE;
          transactionHistoryModel.transferId = transferId;
          await this.transactionHistoryRepository.create(transactionHistoryModel);
        }

        /**update transfer status from pending to done */
        await this.transferRepository.updateById(transferId, {status: TransferStatus.DONE});

        /**send email */
        if (currentUser && targetUser) {
          const currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss")
          /*const message: Notification = new Notification({
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

          await this.notifProvider.publish(message);*/
          const message: MailDataRequired = {
            subject: "Transfer successfully",
            html: `<div>
              <p>Hi, ${currentUser.username}</p>
              <p>Transfer successfully</p>
              <p>Your Moongate account has successfully transferred ${transfer?.amount} T on ${currentDateTime}. The recipient's user ID is ${targetUser.username}</p>
              <p>This is a system email, please do not reply.</p>
              <p>Best Regards,</p>
              <p>Team Moongate</p>
            </div>`,
            to: {email: currentUser.email},
            from: 'support@moongate.investments',
          };
          await this.sendGridService.send(message);
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
          /*const message: Notification = new Notification({
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

          await this.notifProvider.publish(message);*/
          const message: MailDataRequired = {
            subject: "Transfer cancelled",
            html: `<div>
                <p>Hi, ${currentUser.username}</p>
                <p>Transfer cancelled</p>
                <p>Your transfer to the user ${targetUser.username} has been successfully cancelled.</p>
                <p>This is a system email, please do not reply.</p>
                <p>Best Regards,</p>
                <p>Team Moongate</p>
            </div>`,
            to: {email: currentUser.email},
            from: 'support@moongate.investments',
          };
          await this.sendGridService.send(message);
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

  @authorize({allowedRoles: ['admin']})
  @authenticate('jwt')
  @post('/transfer/admin')
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
  async adminTransfer(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody(AdminCreateTransferRequestBody) transferRequset: TransferRequest,
  ): Promise<any> {

    const senderUser = await this.userRepository.findOne({where: {username: transferRequset.sender}})
    if (!senderUser) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current sender user doesn't exist"
      }
    }

    if (!senderUser.emailVerified) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current sender user isn't active"
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


    const investmentResult = await this.investmentRepository
      .findOne({
        where: {userId: senderUser.id}
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


    if (senderUser && targetUser) {
      let transfer = new Transfer();
      transfer.userId = senderUser.id;
      transfer.sender = senderUser.username as any;
      transfer.receiver = targetUser.username as any;
      transfer.amount = transferRequset.amount;
      transfer.createDate = new Date();
      transfer.status = TransferStatus.DONE;
      const result = await this.transferRepository.create(transfer);

      let originalPurchasedTotal = undefined;
      let currentPurchasedTotal = undefined;
      let originalLockedTotal = undefined;
      let currentLockedTotal = undefined
      let transactionHistoryModel = undefined;

      /**update sender user investment */
      const senderInvestment = await this.investmentRepository.findOne({where: {userId: senderUser.id}});
      if (senderInvestment) {
        originalPurchasedTotal = senderInvestment.purchasedTotal.toString();
        currentPurchasedTotal = parseFloat(originalPurchasedTotal) - transferRequset.amount;

        originalLockedTotal = senderInvestment.lockedTotal.toString();
        currentLockedTotal = parseFloat(originalLockedTotal) - transferRequset.amount;

        await this.investmentRepository.updateById(senderInvestment.id, {
          purchasedTotal: currentPurchasedTotal,
          lockedTotal: currentLockedTotal
        })
      }

      /**insert transfer record to transaction history */
      transactionHistoryModel = new TransactionHistory();
      transactionHistoryModel.userId = senderUser.userId;
      transactionHistoryModel.activity = TransactionActivey.TRNASFER;
      transactionHistoryModel.amount = -transferRequset.amount;
      transactionHistoryModel.date = new Date()
      transactionHistoryModel.status = TransactionStatus.ACTIVE;
      transactionHistoryModel.transferId = result.id;
      await this.transactionHistoryRepository.create(transactionHistoryModel);

      /**update target user investment */
      const targetInvestment = await this.investmentRepository.findOne({where: {userId: targetUser.id}});
      if (targetInvestment) {
        originalPurchasedTotal = targetInvestment.purchasedTotal.toString();
        currentPurchasedTotal = parseFloat(originalPurchasedTotal) + transferRequset.amount;

        originalLockedTotal = targetInvestment.lockedTotal.toString();
        currentLockedTotal = parseFloat(originalLockedTotal) + transferRequset.amount;

        await this.investmentRepository.updateById(targetInvestment.id, {
          purchasedTotal: currentPurchasedTotal,
          lockedTotal: currentLockedTotal
        });
      }

      /**insert transfer record to transaction history */
      transactionHistoryModel = new TransactionHistory();
      transactionHistoryModel.userId = targetUser.id;
      transactionHistoryModel.activity = TransactionActivey.TRNASFER;
      transactionHistoryModel.amount = transferRequset.amount;
      transactionHistoryModel.date = new Date()
      transactionHistoryModel.status = TransactionStatus.ACTIVE;
      transactionHistoryModel.transferId = result.id;
      await this.transactionHistoryRepository.create(transactionHistoryModel);

      return {
        "data": result,
        "status": Status.SUCCESS.toString(),
        "errorCode": "",
        "errorMessage": ""
      }
    }
  }

  @authorize({allowedRoles: ['admin']})
  @authenticate('jwt')
  @get('/transfer/count/admin')
  @response(200, {
    description: 'Transfer model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async countByAdmin(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.where(Transfer) where?: Where<Transfer>,
  ): Promise<any> {
    const count = await this.transferRepository.count(where);
    return {
      "data": count,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @authorize({allowedRoles: ['admin']})
  @authenticate('jwt')
  @get('/transfer/admin')
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
  async findByAdmin(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.filter(Transfer) filter?: Filter<Transfer>,
  ): Promise<any> {
    const result = (await this.transferRepository
      .find(filter))
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

}

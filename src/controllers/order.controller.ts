import {authenticate} from '@loopback/authentication';
import {UserRepository} from '@loopback/authentication-jwt';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {
  Filter, repository,
  Where
} from '@loopback/repository';
import {
  del, get, HttpErrors, param, post, requestBody,
  response,
  SchemaObject
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {OrderStatus, OrderType, Status, TransactionActivey, TransactionStatus} from '../constant';
import {Order, OrderRequest, TransactionHistory} from '../models';
import {InvestmentRepository, OrderRepository, TransactionHistoryRepository} from '../repositories';

const CreateOrderSchema: SchemaObject = {
  type: 'object',
  required: ['username', 'amount', 'orderType'],
  properties: {
    username: {
      type: 'string',
      description: '购买Token的username',
      example: 'User123456'
    },
    amount: {
      type: 'number',
      description: '转账金额',
      example: '1.23'
    },
    orderType: {
      type: 'string',
      description: '订购类型',
      example: 'PURCHASE | RELEASE'
    },
    txid: {
      type: 'string',
      description: '输入链上交易记录的TxID',
      example: ''
    }
  }
};

export const CreateOrderRequestBody = {
  description: 'The input of createTransfer function',
  require: true,
  content: {
    'application/json': {schema: CreateOrderSchema},
  }
};

@authorize({allowedRoles: ['admin']})
export class OrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UserRepository) protected userRepository: UserRepository,
    @repository(InvestmentRepository)
    public investmentRepository: InvestmentRepository,
    @repository(TransactionHistoryRepository)
    public transactionHistoryRepository: TransactionHistoryRepository
  ) { }

  @authenticate('jwt')
  @post('/orders')
  @response(200, {
    description: 'Order model instance',
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
    },
  })
  async create(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @requestBody(CreateOrderRequestBody) orderRequest: OrderRequest,
  ): Promise<any> {
    try {
      if (orderRequest.orderType !== OrderType.PURCHASE && orderRequest.orderType !== OrderType.RELEASE) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current order type can't support"
        }
      }

      const selectedUser = await this.userRepository.findOne({where: {username: orderRequest.username}});
      if (!selectedUser) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current selected user isn't exist"
        }
      }
      if (!selectedUser.emailVerified) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current selected user isn't active"
        }
      }

      const orderType = orderRequest.orderType === OrderType.PURCHASE ? OrderType.PURCHASE : OrderType.RELEASE;

      /** current selected user investment information*/
      const orignalInvestment = await this.investmentRepository.findOne({where: {userId: selectedUser.id}}) as any

      if (orderType === OrderType.RELEASE && orderRequest.amount > parseFloat(orignalInvestment?.lockedTotal.toString())) {
        return {
          "data": {},
          "status": Status.FAILED.toString(),
          "errorCode": "400",
          "errorMessage": "current released amount more than locked amount for current selected user"
        }
      }

      let order = new Order();
      order.userId = selectedUser.id;
      order.username = selectedUser.username as any;
      order.orderType = orderType;
      order.amount = orderRequest.amount;
      order.createDate = new Date();
      order.status = OrderStatus.ACTIVE;
      if (orderRequest.txid) {
        order.txid = orderRequest.txid;
      }

      /**create order recoder */
      const result = await this.orderRepository.create(order);

      if (orderType === OrderType.PURCHASE) {
        /**increase current selected purchase total */
        const originalPurchasedTotal = orignalInvestment.purchasedTotal.toString();
        const currentPurchasedTotal = parseFloat(originalPurchasedTotal) + orderRequest.amount;
        const originalLockedTotal = orignalInvestment.lockedTotal.toString();
        const currentLockedTotal = parseFloat(originalLockedTotal) + orderRequest.amount;
        await this.investmentRepository.updateById(orignalInvestment.id, {purchasedTotal: currentPurchasedTotal, lockedTotal: currentLockedTotal});

        /**add current order to transaction history */
        let transactionHistory = new TransactionHistory();
        transactionHistory.userId = selectedUser.id;
        transactionHistory.amount = orderRequest.amount;
        transactionHistory.activity = TransactionActivey.PURCHASE;
        transactionHistory.orderId = result.id;
        transactionHistory.status = TransactionStatus.ACTIVE
        await this.transactionHistoryRepository.create(transactionHistory);

      }
      else if (orderType === OrderType.RELEASE) {
        /**reduce current selected locked total and increase released total */
        const originalLockedTotal = orignalInvestment.lockedTotal.toString();
        const currentLockedTotal = parseFloat(originalLockedTotal) - orderRequest.amount;
        const originalReleasedTotal = orignalInvestment.releasedTotal.toString();
        const currentReleasedTotal = parseFloat(originalReleasedTotal) + orderRequest.amount;
        await this.investmentRepository.updateById(orignalInvestment.id, {releasedTotal: currentReleasedTotal, lockedTotal: currentLockedTotal});

        /**add current order to transaction history */
        let transactionHistory = new TransactionHistory();
        transactionHistory.userId = selectedUser.id;
        transactionHistory.amount = orderRequest.amount;
        transactionHistory.activity = TransactionActivey.RELEASE;
        transactionHistory.orderId = result.id;
        transactionHistory.status = TransactionStatus.ACTIVE
        await this.transactionHistoryRepository.create(transactionHistory);
      }

      return {
        "data": result,
        "status": Status.SUCCESS.toString(),
        "errorCode": "",
        "errorMessage": ""
      }
    }
    catch (e) {
      throw new HttpErrors.InternalServerError(e);
    }

  }

  @authenticate('jwt')
  @get('/orders/count')
  @response(200, {
    description: 'Order model count',
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
    },
  })
  async count(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
    @param.where(Order) where?: Where<Order>,
  ): Promise<any> {
    const count = await this.orderRepository.count({...where});
    return {
      "data": count,
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    };
  }

  @authenticate('jwt')
  @get('/orders')
  @response(200, {
    description: 'Array of Order model instances',
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
    @param.filter(Order) filter?: Filter<Order>,
  ): Promise<any> {
    const result = (await this.orderRepository
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

  // @patch('/orders')
  // @response(200, {
  //   description: 'Order PATCH success count',
  //   content: {'application/json': {schema: CountSchema}},
  // })
  // async updateAll(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Order, {partial: true}),
  //       },
  //     },
  //   })
  //   order: Order,
  //   @param.where(Order) where?: Where<Order>,
  // ): Promise<Count> {
  //   return this.orderRepository.updateAll(order, where);
  // }

  // @get('/orders/{id}')
  // @response(200, {
  //   description: 'Order model instance',
  //   content: {
  //     'application/json': {
  //       schema: getModelSchemaRef(Order, {includeRelations: true}),
  //     },
  //   },
  // })
  // async findById(
  //   @param.path.string('id') id: string,
  //   @param.filter(Order, {exclude: 'where'}) filter?: FilterExcludingWhere<Order>
  // ): Promise<Order> {
  //   return this.orderRepository.findById(id, filter);
  // }

  // @patch('/orders/{id}')
  // @response(204, {
  //   description: 'Order PATCH success',
  // })
  // async updateById(
  //   @param.path.string('id') id: string,
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(Order, {partial: true}),
  //       },
  //     },
  //   })
  //   order: Order,
  // ): Promise<void> {
  //   await this.orderRepository.updateById(id, order);
  // }

  // @put('/orders/{id}')
  // @response(204, {
  //   description: 'Order PUT success',
  // })
  // async replaceById(
  //   @param.path.string('id') id: string,
  //   @requestBody() order: Order,
  // ): Promise<void> {
  //   await this.orderRepository.replaceById(id, order);
  // }

  @authenticate('jwt')
  @del('/orders/{id}')
  @response(204, {
    description: 'Order DELETE success',
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

    const selectOrder = await this.orderRepository.findById(id);
    if (!selectOrder) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current order isn't exist"
      }
    }

    if (selectOrder.status === OrderStatus.DELETED) {
      return {
        "data": {},
        "status": Status.FAILED.toString(),
        "errorCode": "400",
        "errorMessage": "current order already deleted"
      }
    }

    /**set the order status is deleted */
    await this.orderRepository.updateById(id, {status: OrderStatus.DELETED, updateDate: new Date()});

    /** current selected user investment information*/
    const orignalInvestment = await this.investmentRepository.findOne({where: {userId: selectOrder.userId}});

    /**Rollback this order */
    if (selectOrder.orderType === OrderType.PURCHASE && orignalInvestment) {
      /**update investment */
      const orderAmount = parseFloat(selectOrder.amount.toString());
      const currentPurchasedTotal = parseFloat(orignalInvestment.purchasedTotal.toString()) - orderAmount;
      const currentLockedTotal = parseFloat(orignalInvestment.lockedTotal.toString()) - orderAmount;
      await this.investmentRepository.updateById(orignalInvestment.id, {purchasedTotal: currentPurchasedTotal, lockedTotal: currentLockedTotal});

      /**set transaction history status to deleted for current order */
      const originalTransactionHistory = await this.transactionHistoryRepository.findOne({where: {orderId: selectOrder.id}});
      await this.transactionHistoryRepository.updateById(originalTransactionHistory?.id as any, {status: TransactionStatus.DELETED});

    }
    else if (selectOrder.orderType === OrderType.RELEASE && orignalInvestment) {
      /**update investment */
      const orderAmount = parseFloat(selectOrder.amount.toString());
      const currentLockedTotal = parseFloat(orignalInvestment.lockedTotal.toString()) + orderAmount;
      const currentReleasedTotal = parseFloat(orignalInvestment.releasedTotal.toString()) - orderAmount;
      await this.investmentRepository.updateById(orignalInvestment.id, {releasedTotal: currentReleasedTotal, lockedTotal: currentLockedTotal});

      /**set transaction history status to deleted for current order */
      const originalTransactionHistory = await this.transactionHistoryRepository.findOne({where: {orderId: selectOrder.id}});
      await this.transactionHistoryRepository.updateById(originalTransactionHistory?.id as any, {status: TransactionStatus.DELETED});
    }

    return {
      "data": {},
      "status": Status.SUCCESS.toString(),
      "errorCode": "",
      "errorMessage": ""
    }

  }
}

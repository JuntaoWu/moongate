import {User, UserRepository} from '@loopback/authentication-jwt';
import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {CounterRepository} from '.';
import {DbDataSource} from '../datasources';
import {Counter, Order, OrderRelations, Transfer} from '../models';

export class OrderRepository extends DefaultCrudRepository<
  Order,
  typeof Order.prototype.id,
  OrderRelations
> {
  user: BelongsToAccessor<User, typeof Transfer.prototype.id>;

  private readonly userSerialNumberInitial = 1;
  private readonly userSerialNumberLength = 10;
  private readonly userSerialNumberPadding = '0';

  constructor(
    @inject('datasources.Db') dataSource: DbDataSource,
    @repository.getter('UserRepository') userRepositoryGetter: Getter<UserRepository>,
    @repository(CounterRepository) private counterRepository: CounterRepository
  ) {
    super(Order, dataSource);
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );
    // add this line to register inclusion resolver.
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }

  definePersistedModel(entityClass: typeof Order) {
    const modelClass = super.definePersistedModel(entityClass);
    modelClass.observe('before save', async ctx => {
      console.log(`going to save ${ctx.Model.modelName}`);
      var app = ctx.Model.dataSource;

      //Apply this hooks for save operation only..
      if (ctx.isNewInstance) {
        //suppose my datasource name is mongodb
        let counter = await this.counterRepository.findOne({where: {collection: 'Order'}});
        if (counter?.value) {
          console.log(counter.value);
          ++counter.value;
          await this.counterRepository.updateById(counter.getId(), counter);
        } else {
          counter = new Counter({value: this.userSerialNumberInitial, collection: 'Order'});
          await this.counterRepository.save(counter);
        }
        ctx.instance.recordNumber = `Order${counter.value.toString().padStart(this.userSerialNumberLength, this.userSerialNumberPadding)}`
      }
    });
    return modelClass;
  }
}

import {User, UserRepository} from '@loopback/authentication-jwt';
import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {CounterRepository} from '.';
import {DbDataSource} from '../datasources';
import {Counter, Transfer, TransferRelations} from '../models';

export class TransferRepository extends DefaultCrudRepository<
  Transfer,
  typeof Transfer.prototype.id,
  TransferRelations
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
    super(Transfer, dataSource);
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );

    // add this line to register inclusion resolver.
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }

  definePersistedModel(entityClass: typeof Transfer) {
    const modelClass = super.definePersistedModel(entityClass);
    modelClass.observe('before save', async ctx => {
      console.log(`going to save ${ctx.Model.modelName}`);
      var app = ctx.Model.dataSource;

      //Apply this hooks for save operation only..
      if (ctx.isNewInstance) {
        //suppose my datasource name is mongodb
        let counter = await this.counterRepository.findOne({where: {collection: 'Transfer'}});
        if (counter?.value) {
          console.log(counter.value);
          ++counter.value;
          await this.counterRepository.updateById(counter.getId(), counter);
        } else {
          counter = new Counter({value: this.userSerialNumberInitial, collection: 'Transfer'});
          await this.counterRepository.save(counter);
        }
        ctx.instance.recordNumber = `Transfer${counter.value.toString().padStart(this.userSerialNumberLength, this.userSerialNumberPadding)}`
        ctx.instance.createDate = new Date();
      } else {
        ctx.data.updateDate = new Date();
      }
    });
    return modelClass;
  }
}

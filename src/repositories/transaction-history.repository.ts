import {User, UserRepository} from '@loopback/authentication-jwt';
import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {TransactionHistory, TransactionHistoryRelations} from '../models';

export class TransactionHistoryRepository extends DefaultCrudRepository<
  TransactionHistory,
  typeof TransactionHistory.prototype.id,
  TransactionHistoryRelations
> {

  user: BelongsToAccessor<User, typeof TransactionHistory.prototype.id>;

  constructor(
    @inject('datasources.Db') dataSource: DbDataSource,
    @repository.getter('UserRepository') userRepositoryGetter: Getter<UserRepository>
  ) {
    super(TransactionHistory, dataSource);

    // we already have this line to create a BelongsToRepository factory
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );

    // add this line to register inclusion resolver.
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }

  definePersistedModel(entityClass: typeof TransactionHistory) {
    const modelClass = super.definePersistedModel(entityClass);
    modelClass.observe('before save', async ctx => {
      console.log(`going to save ${ctx.Model.modelName}`);
      var app = ctx.Model.dataSource;

      //Apply this hooks for save operation only..
      if (ctx.isNewInstance) {
        ctx.instance.date = new Date();
      }
    });
    return modelClass;
  }
}

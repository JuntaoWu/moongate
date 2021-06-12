import {User, UserRepository} from '@loopback/authentication-jwt';
import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Investment, InvestmentRelations} from '../models';

export class InvestmentRepository extends DefaultCrudRepository<
  Investment,
  typeof Investment.prototype.id,
  InvestmentRelations
> {
  user: BelongsToAccessor<User, typeof Investment.prototype.id>;
  constructor(
    @inject('datasources.Db') dataSource: DbDataSource,
    @repository.getter('UserRepository') userRepositoryGetter: Getter<UserRepository>
  ) {
    super(Investment, dataSource);
    // we already have this line to create a BelongsToRepository factory
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );

    // add this line to register inclusion resolver.
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}

import {User, UserRepository} from '@loopback/authentication-jwt';
import {Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Transfer, TransferRelations} from '../models';

export class TransferRepository extends DefaultCrudRepository<
  Transfer,
  typeof Transfer.prototype.id,
  TransferRelations
> {
  user: BelongsToAccessor<User, typeof Transfer.prototype.id>;
  constructor(
    @inject('datasources.Db') dataSource: DbDataSource,
    @repository.getter('UserRepository') userRepositoryGetter: Getter<UserRepository>
  ) {
    super(Transfer, dataSource);
    this.user = this.createBelongsToAccessorFor(
      'user',
      userRepositoryGetter,
    );

    // add this line to register inclusion resolver.
    this.registerInclusionResolver('user', this.user.inclusionResolver);
  }
}

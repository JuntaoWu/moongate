import {UserCredentials, UserCredentialsRepository} from '@loopback/authentication-jwt';
import {Getter, inject} from '@loopback/core';
import {DefaultCrudRepository, HasOneRepositoryFactory, repository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {MoongateUser, MoongateUserRelations} from '../models';
import {CounterRepository} from './counter.repository';

export class MoongateUserRepository extends DefaultCrudRepository<
  MoongateUser,
  typeof MoongateUser.prototype.id,
  MoongateUserRelations
> {
  public readonly userCredentials: HasOneRepositoryFactory<
    UserCredentials,
    typeof MoongateUser.prototype.id
  >;

  private readonly userSerialNumberInitial = 1;
  private readonly userSerialNumberLength = 6;
  private readonly userSerialNumberPadding = '0';

  constructor(
    @inject('datasources.Db') dataSource: DbDataSource,
    @repository.getter('UserCredentialsRepository')
    protected userCredentialsRepositoryGetter: Getter<UserCredentialsRepository>,
    @repository(CounterRepository) private counterRepository: CounterRepository
  ) {
    super(MoongateUser, dataSource);
    this.userCredentials = this.createHasOneRepositoryFactoryFor(
      'userCredentials',
      userCredentialsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'userCredentials',
      this.userCredentials.inclusionResolver,
    );
  }

  async findCredentials(
    userId: typeof MoongateUser.prototype.id,
  ): Promise<UserCredentials | undefined> {
    try {
      return await this.userCredentials(userId).get();
    } catch (err) {
      if (err.code === 'ENTITY_NOT_FOUND') {
        return undefined;
      }
      throw err;
    }
  }

  definePersistedModel(entityClass: typeof MoongateUser) {
    const modelClass = super.definePersistedModel(entityClass);
    modelClass.observe('before save', async ctx => {
      console.log(`going to save ${ctx.Model.modelName}`);
      //Apply this hooks for save operation only..
      if (ctx.isNewInstance) {
        let randomUsername = `user${Math.floor(Math.random() * 1000000)}`;
        while (await this.findOne({where: {username: randomUsername}})) {
          randomUsername = `user${Math.floor(Math.random() * 1000000)}`;
        }

        ctx.instance.username = randomUsername;
        ctx.instance.createdAt = new Date();
      } else {
        ctx.data.updatedAt = new Date();
      }
    });
    return modelClass;
  }
}

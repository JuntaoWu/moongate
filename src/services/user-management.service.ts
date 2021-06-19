import {UserService} from '@loopback/authentication';
import {Credentials} from '@loopback/authentication-jwt';
import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {compare} from 'bcryptjs';
import {v4 as uuidv4} from 'uuid';
import {MoongateUser, MoongateUserWithRelations} from '../models/moongate-user.model';
import {MoongateUserRepository} from '../repositories';
import {subtractDates} from '../utils/substract-dates';

@injectable({scope: BindingScope.TRANSIENT})
export class UserManagementService implements UserService<MoongateUser, Credentials> {

  constructor(@repository(MoongateUserRepository) private userRepository: MoongateUserRepository) {
  }

  convertToUserProfile(user: MoongateUser): UserProfile {
    return {
      [securityId]: user.id,
      name: user.username,
      id: user.id,
      email: user.email,
      roles: user.roles
    };
  }

  //function to find user by id
  async findUserById(id: string): Promise<MoongateUser & MoongateUserWithRelations> {
    const userNotfound = 'invalid User';
    const foundUser = await this.userRepository.findOne({
      where: {id: id},
    });

    if (!foundUser) {
      throw new HttpErrors.Unauthorized(userNotfound);
    }
    return foundUser;
  }

  async verifyCredentials(credentials: Credentials): Promise<MoongateUser> {

    const invalidCredentialsError = 'Invalid email or password.';

    const foundUser = await this.userRepository.findOne({
      where: {email: credentials.email},
    });
    if (!foundUser) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const credentialsFound = await this.userRepository.findCredentials(
      foundUser.id,
    );
    if (!credentialsFound) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const passwordMatched = await compare(
      credentials.password,
      credentialsFound.password,
    );

    if (!passwordMatched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    if (!foundUser.emailVerified) {
      throw new HttpErrors.Unauthorized(`The user you entered does not exist or not activated, please contact admin`);
    }

    if (foundUser.locked) {
      throw new HttpErrors.Forbidden(`The user has been locked temporarily, please contact admin`);
    }

    return foundUser;
  }

  async requestPasswordReset(email: string): Promise<MoongateUser> {
    const noAccountFoundError =
      'No account associated with the provided email address.';
    const foundUser = await this.userRepository.findOne({
      where: {email},
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(noAccountFoundError);
    }

    const user = await this.updateResetRequestLimit(foundUser);

    try {
      await this.userRepository.updateById(user.id, user);
    } catch (e) {
      return e;
    }

    return user;
  }

  /**
   * Checks user reset timestamp if its same day increase count
   * otherwise set current date as timestamp and start counting
   * For first time reset request set reset count to 1 and assign same day timestamp
   * @param user
   */
  async updateResetRequestLimit(user: MoongateUser): Promise<MoongateUser> {
    const resetTimestampDate = new Date(user.resetTimestamp);

    const difference = await subtractDates(resetTimestampDate);

    if (difference === 0) {
      user.resetCount = user.resetCount + 1;

      if (user.resetCount > +(process.env.PASSWORD_RESET_EMAIL_LIMIT ?? 2)) {
        throw new HttpErrors.TooManyRequests(
          'Account has reached daily limit for sending password-reset requests',
        );
      }
    } else {
      user.resetTimestamp = new Date().toLocaleDateString();
      user.resetCount = 1;
    }
    // For generating unique reset key there are other options besides the proposed solution below.
    // Feel free to use whatever option works best for your needs
    user.resetKey = uuidv4();
    user.resetKeyTimestamp = new Date().toLocaleDateString();

    return user;
  }

  /**
   * Ensures reset key is only valid for a day
   * @param user
   */
  async validateResetKeyLifeSpan(user: MoongateUser): Promise<MoongateUser> {
    const resetKeyLifeSpan = new Date(user.resetKeyTimestamp);
    const difference = await subtractDates(resetKeyLifeSpan);

    user.resetKey = '';
    user.resetKeyTimestamp = '';

    if (difference !== 0) {
      throw new HttpErrors.BadRequest('The provided reset key has expired.');
    }

    return user;
  }
}

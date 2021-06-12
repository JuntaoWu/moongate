import {MyUserService, User, UserRepository} from '@loopback/authentication-jwt';
import {HttpErrors} from '@loopback/rest';
import {v4 as uuidv4} from 'uuid';
import {subtractDates} from '../utils/substract-dates';

export class UserManagementService extends MyUserService {

  constructor(userRepository: UserRepository) {
    super(userRepository);
  }

  async requestPasswordReset(email: string): Promise<User> {
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
  async updateResetRequestLimit(user: User): Promise<User> {
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
  async validateResetKeyLifeSpan(user: User): Promise<User> {
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

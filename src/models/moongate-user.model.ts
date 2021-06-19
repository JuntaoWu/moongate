import {User} from '@loopback/authentication-jwt';
import {model} from '@loopback/repository';

@model()
export class MoongateUser extends User {

  // @property({
  //   type: 'string',
  //   id: true,
  //   generated: true,
  // })
  // id: string;

  // @property({
  //   type: 'string'
  // })
  // realm?: string;

  // @property({
  //   type: 'string'
  // })
  // username?: string;

  // @property({
  //   type: 'string'
  // })
  // email: string;

  // @property({
  //   type: 'boolean'
  // })
  // emailVerified?: boolean;

  // @property({
  //   type: 'string'
  // })
  // verificationToken?: string;

  // @property({
  //   type: 'object'
  // })
  // userCredentials: UserCredentials;

  // [prop: string]: any;

  constructor(data?: Partial<MoongateUser>) {
    super(data);
  }
}

export interface MoongateUserRelations {
  // describe navigational properties here
}

export type MoongateUserWithRelations = MoongateUser & MoongateUserRelations;

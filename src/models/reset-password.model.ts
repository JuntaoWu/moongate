import {model, property} from '@loopback/repository';

@model({settings: {strict: false}})
export class ResetPassword {

  constructor() {
  }

  @property({
    type: 'string',
    required: true,
  })
  token: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

}

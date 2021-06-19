// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/example-access-control-migration
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationMetadata,
  AuthorizationRequest,
  Authorizer
} from '@loopback/authorization';
import {BindingKey, Provider} from '@loopback/core';
const DEFAULT_SCOPE = 'execute';

// Class level authorizer
export class CasbinAuthorizationProvider implements Provider<Authorizer> {
  constructor(
  ) { }

  /**
   * @returns authenticateFn
   */
  value(): Authorizer {
    return this.authorize.bind(this);
  }

  async authorize(
    authorizationCtx: AuthorizationContext,
    metadata: AuthorizationMetadata,
  ): Promise<AuthorizationDecision> {
    const principalRoles: string[] = authorizationCtx.principals[0].roles;
    const subject = this.getUserName(authorizationCtx.principals[0].id);
    const resourceId = await authorizationCtx.invocationContext.get(
      BindingKey.create<string>('resourceId'),
      {optional: true},
    );
    const object = resourceId ?? metadata.resource ?? authorizationCtx.resource;

    const request: AuthorizationRequest = {
      subject,
      object,
      action: metadata.scopes?.[0] ?? DEFAULT_SCOPE,
    };

    const allowedRoles = metadata.allowedRoles;

    if (!allowedRoles) return AuthorizationDecision.ALLOW;
    if (allowedRoles.length < 1) return AuthorizationDecision.DENY;

    let allow = false;

    // An optimization for ONLY searching among the allowed roles' policies
    for (const role of allowedRoles) {
      const allowedByRole = principalRoles && principalRoles.lastIndexOf(role) != -1;

      console.log(`authorizer role: ${role}, result: ${allowedByRole}`);
      if (allowedByRole) {
        allow = true;
        break;
      }
    }

    console.log('final result: ', allow);

    if (allow) return AuthorizationDecision.ALLOW;
    else if (allow === false) return AuthorizationDecision.DENY;
    return AuthorizationDecision.ABSTAIN;
  }

  // Generate the user name according to the naming convention
  // in basic policy
  // A user's name would be `${id}`
  getUserName(id: string): string {
    return `${id}`;
  }
}

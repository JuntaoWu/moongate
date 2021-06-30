import {AuthenticationComponent} from '@loopback/authentication';
import {
  JWTAuthenticationComponent,

  TokenServiceBindings,

  TokenServiceConstants,

  UserServiceBindings
} from '@loopback/authentication-jwt';
import {AuthorizationBindings, AuthorizationComponent, AuthorizationDecision, AuthorizationOptions} from '@loopback/authorization';
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import {MailService} from '@sendgrid/mail';
import {
  NotificationBindings, NotificationsComponent,

  SESBindings,

  SesProvider
} from 'loopback4-notifications';
import path from 'path';
import {CasbinAuthorizationComponent} from './authorize/casbin-authorization-component';
import {JWTService} from './authorize/jwt.service';
import {DbDataSource} from './datasources';
import {MoongateUserRepository} from './repositories';
import {MySequence} from './sequence';
import {SendGridBindings, SendgridService, UserManagementService} from './services';

export {ApplicationConfig};

export class MoongateApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };

    // ------ ADD SNIPPET AT THE BOTTOM ---------
    // Mount authentication system
    this.component(AuthenticationComponent);
    // Mount jwt component included custom jwt service for basic roles authorization.
    this.component(JWTAuthenticationComponent);
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(
      TokenServiceConstants.TOKEN_SECRET_VALUE,
    );
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(
      TokenServiceConstants.TOKEN_EXPIRES_IN_VALUE,
    );
    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);

    // loopback/notifications.
    this.component(NotificationsComponent);
    // Authorization
    const authorizationOptions: AuthorizationOptions = {
      precedence: AuthorizationDecision.DENY,
      defaultDecision: AuthorizationDecision.DENY,
    };
    this.configure(AuthorizationBindings.COMPONENT).to(authorizationOptions);
    this.component(AuthorizationComponent);
    // my custom authorizationComponent
    this.component(CasbinAuthorizationComponent);

    // Bind datasource
    this.dataSource(DbDataSource, UserServiceBindings.DATASOURCE_NAME);
    // ------------- END OF SNIPPET -------------

    // UserManagementService
    this.bind(UserServiceBindings.USER_SERVICE).toClass(UserManagementService);
    // Bind user and credentials repository
    this.bind(UserServiceBindings.USER_REPOSITORY).toClass(
      MoongateUserRepository,
    );

    // Aws-Ses
    this.bind(NotificationBindings.Config).to({
      sendToMultipleReceivers: false,
      senderEmail: 'support@cepheus.info'
    });
    this.bind(SESBindings.Config).to({
      accessKeyId: process.env.SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
      region: process.env.SES_REGION,
    });
    this.bind(NotificationBindings.EmailProvider).toProvider(SesProvider);
    this.bind(SendGridBindings.SEND_GRID_SERVICE).toClass(
      SendgridService
    );
    this.bind(MailService.name).toClass(
      MailService
    );
  }
}

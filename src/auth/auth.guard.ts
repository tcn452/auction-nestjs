
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { createDirectus, rest, staticToken, readMe } from '@directus/sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly directusUrl: string;

  constructor(private configService: ConfigService) {
    this.directusUrl = this.configService.get<string>('DIRECTUS_URL') as string;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      this.logger.warn('Auth failed: No token provided.');
      throw new UnauthorizedException('Authentication token is required.');
    }

    try {
      // Create a temporary Directus client authenticated with the user's token
      const userDirectus = createDirectus(this.directusUrl)
        .with(rest())
        .with(staticToken(token));

      // Verify the token by fetching the user's own data
      const user = await userDirectus.request(readMe({ fields: ['*'] }));

      if (user) {
        this.logger.log(`User authenticated via token: ${user.id}`);
        (request as any).user = user; // Attach user to the request
        return true;
      } else {
        throw new Error('User data not returned from /users/me');
      }
    } catch (error: any) {
      this.logger.error('Auth failed: Token verification error.', error.message);
      throw new UnauthorizedException('Authentication failed or token invalid.');
    }
  }
}
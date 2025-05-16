/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/auth/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PocketBaseService } from 'src/pocketbase/pocketbase.service'; // Import PocketBaseService
import { Request } from 'express'; // Import Request from express

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private pocketBaseService: PocketBaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>(); // Explicitly type the request
    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      this.logger.warn('Authentication failed: No token provided.');
      // Throw UnauthorizedException to return 401 response
      throw new UnauthorizedException('Authentication token is required.');
    }

    // Use the PocketBaseService to get a user-specific PB client
    const userPb = this.pocketBaseService.createUserClient();

    try {
      // Attempt to authenticate the request with the provided token
      userPb.authStore.save(token, null);

      // Verify the token by fetching the auth record
      const authRecord = await userPb.collection('users').authRefresh(); // Assuming 'users' is your auth collection

      // If authentication is successful, attach the user record to the request
      if (authRecord.record) {
        this.logger.log(
          `User authenticated via token: ${authRecord.record.id}`,
        );
        (request as any).user = authRecord.record; // Attach user to the request object with type assertion
        return true; // Authentication successful, allow access
      } else {
        this.logger.warn('Authentication failed: Token invalid or expired.');
        userPb.authStore.clear();
        throw new UnauthorizedException(
          'Invalid or expired authentication token.',
        );
      }
    } catch (error: any) {
      this.logger.error(
        'Authentication failed: Token verification error.',
        error.message,
      );
      userPb.authStore.clear();
      throw new UnauthorizedException('Authentication failed.');
    }
  }
}

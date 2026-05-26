import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { CacheService } from '../../cache/cache.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  /** tokenVersion: must match user.tokenVersion or the token is considered stale */
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly cacheService: CacheService,
  ) {
    // Fix #3: Fail fast at startup if JWT_SECRET is not configured.
    // A missing/default secret allows attackers to forge tokens.
    const secret = configService.get<string>('jwt.secret');
    if (!secret) {
      throw new Error(
        'JWT_SECRET environment variable is required but not set. ' +
        'Application cannot start without a secure signing key.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    // Check token blacklist (logout invalidation)
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const blacklisted = await this.cacheService.isBlacklisted(token || '');
    if (blacklisted) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Fix #8: Validate tokenVersion to reject tokens issued before a password
    // reset or password change. The JWT `tv` claim must match the DB value.
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException(
        'Session has been invalidated. Please log in again.',
      );
    }

    return user;
  }
}

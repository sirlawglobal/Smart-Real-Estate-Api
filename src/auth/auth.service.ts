import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { CacheService } from '../cache/cache.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from '../users/entities/user.entity';
import { EVENTS } from '../events/event-names';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const token = this.generateToken(user);

    this.eventEmitter.emit(EVENTS.USER_REGISTERED, { user });

    return {
      message: 'Registration successful',
      data: { token, user: this.sanitizeUser(user) },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const isValid = await user.validatePassword(loginDto.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken(user);
    return {
      message: 'Login successful',
      data: { token, user: this.sanitizeUser(user) },
    };
  }

  async logout(token: string): Promise<{ message: string }> {
    const decoded = this.jwtService.decode(token) as any;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.cacheService.addToBlacklist(token, ttl);
      }
    }
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return success to prevent email enumeration attacks
    if (!user) return { message: 'If the email exists, a reset link has been sent' };

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = token;
    user.resetTokenExpires = expires;
    await this.usersService.save(user);

    this.eventEmitter.emit(EVENTS.AUTH_FORGOT_PASSWORD, { user, token });

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByResetToken(dto.token);

    if (!user || !user.resetTokenExpires || user.resetTokenExpires <= new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Assign raw password — @BeforeUpdate on User entity will hash it
    user.password = dto.password;
    user.resetToken = null;
    user.resetTokenExpires = null;

    // Fix #8: Bump tokenVersion to invalidate ALL previously issued JWTs for this user.
    // Any token with an older `tv` claim will be rejected in JwtStrategy.validate().
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;

    await this.usersService.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<{ message: string }> {
    const isValid = await user.validatePassword(dto.currentPassword);
    if (!isValid) throw new UnauthorizedException('Current password is incorrect');

    // Fix #11: Assign raw password — @BeforeUpdate hook will hash it.
    // Previously bcrypt.hash() was called here AND in the entity hook, causing double-hashing.
    user.password = dto.newPassword;

    // Bump tokenVersion to force re-login on all other devices after a password change
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;

    await this.usersService.save(user);

    return { message: 'Password changed successfully' };
  }

  async getMe(user: User) {
    return { message: 'Profile fetched', data: this.sanitizeUser(user) };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      // Fix #8: Include tokenVersion in JWT so stale tokens can be rejected
      tv: user.tokenVersion ?? 0,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}

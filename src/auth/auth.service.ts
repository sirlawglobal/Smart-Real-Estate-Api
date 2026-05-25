import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
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
import * as bcrypt from 'bcrypt';
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

    this.eventEmitter.emit('user.registered', { user });

    return {
      message: 'Registration successful',
      data: { token, user: this.sanitizeUser(user) },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isValid = await user.validatePassword(loginDto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
    if (!user) {
      // Return success regardless to prevent email enumeration
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = uuidv4();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetToken = token;
    user.resetTokenExpires = expires;
    await this.usersService.save(user);

    this.eventEmitter.emit('auth.forgot-password', { user, token });

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const users = await this.usersService.findAll();
    const user = users.find(
      (u) => u.resetToken === dto.token && u.resetTokenExpires && u.resetTokenExpires > new Date(),
    );

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.password = dto.password;
    user.resetToken = null;
    user.resetTokenExpires = null;
    await this.usersService.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<{ message: string }> {
    const isValid = await user.validatePassword(dto.currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.save(user);

    return { message: 'Password changed successfully' };
  }

  async getMe(user: User) {
    return { message: 'Profile fetched', data: this.sanitizeUser(user) };
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
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

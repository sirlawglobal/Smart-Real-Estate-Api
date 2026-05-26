import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../enums/user-role.enum';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.BUYER })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'reset_token', type: 'varchar', nullable: true })
  @Exclude()
  resetToken: string | null;

  @Column({ name: 'reset_token_expires', type: 'datetime', nullable: true })
  @Exclude()
  resetTokenExpires: Date | null;

  /**
   * Incremented on every password reset / change.
   * The JWT payload includes this value (as `tv`); if they differ, the token is
   * considered stale and the request is rejected — this invalidates all
   * previously issued tokens without a blocklist round-trip.
   */
  @Column({ name: 'token_version', type: 'int', default: 0 })
  @Exclude()
  tokenVersion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

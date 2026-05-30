import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Column,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'lead_id' })
  leadId: number;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @Column({ name: 'is_ai_active', default: true })
  isAiActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

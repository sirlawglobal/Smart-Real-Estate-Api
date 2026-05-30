import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../users/enums/user-role.enum';
import { Property } from '../../properties/entities/property.entity';
import { PropertyImage } from '../../properties/entities/property-image.entity';
import { PropertyType, ListingType, ApprovalStatus } from '../../properties/enums/property.enum';
import { Lead } from '../../leads/entities/lead.entity';
import { LeadStatus, LeadPriority } from '../../leads/enums/lead.enum';
import { Conversation } from '../../chat/entities/conversation.entity';
import { Message } from '../../chat/entities/message.entity';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { Notification } from '../../notifications/entities/notification.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(PropertyImage) private imageRepo: Repository<PropertyImage>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Favorite) private favoriteRepo: Repository<Favorite>,
    @InjectRepository(Notification) private notificationRepo: Repository<Notification>,
  ) { }

  async seed() {
    this.logger.log('Starting DB Seeding...');

    // Clear existing data (Be careful in production!)
    await this.clearDatabase();

    // 1. Seed Users (Admin, Agents, Buyers)
    const admin = await this.seedUsers();

    // 2. Seed Properties
    const properties = await this.seedProperties();

    // 3. Seed Leads
    const leads = await this.seedLeads(properties);

    // 4. Seed Chats
    await this.seedChats(leads);

    // 5. Seed Favorites & Notifications
    await this.seedFavoritesAndNotifications(properties);

    this.logger.log('Seeding completed successfully!');
  }

  private async clearDatabase() {
    this.logger.log('Clearing database...');
    await this.notificationRepo.createQueryBuilder().delete().execute();
    await this.favoriteRepo.createQueryBuilder().delete().execute();
    await this.messageRepo.createQueryBuilder().delete().execute();
    await this.conversationRepo.createQueryBuilder().delete().execute();
    await this.leadRepo.createQueryBuilder().delete().execute();
    await this.imageRepo.createQueryBuilder().delete().execute();
    await this.propertyRepo.createQueryBuilder().delete().execute();
    await this.userRepo.createQueryBuilder().delete().execute();
  }

  private async seedUsers() {
    this.logger.log('Seeding Users...');

    // 1 Admin
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const admin = this.userRepo.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@realestate.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
      phone: '+2348000000000',
    });
    const savedAdmin = await this.userRepo.save(admin);
    this.logger.log(`Admin created: admin@realestate.com / Admin@123`);

    // 5 Agents
    const agentPassword = await bcrypt.hash('Agent@123', 12);
    for (let i = 1; i <= 5; i++) {
      await this.userRepo.save(
        this.userRepo.create({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: `agent${i}@realestate.com`,
          password: agentPassword,
          role: UserRole.AGENT,
          isActive: true,
          phone: faker.phone.number(),
        }),
      );
    }
    this.logger.log(`5 Agents created (agent1@realestate.com to agent5@realestate.com with Agent@123)`);

    // 10 Buyers
    const buyerPassword = await bcrypt.hash('Buyer@123', 12);
    for (let i = 1; i <= 10; i++) {
      await this.userRepo.save(
        this.userRepo.create({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: `buyer${i}@example.com`,
          password: buyerPassword,
          role: UserRole.BUYER,
          isActive: true,
          phone: faker.phone.number(),
        }),
      );
    }
    this.logger.log(`10 Buyers created (buyer1@example.com to buyer10@example.com with Buyer@123)`);

    return savedAdmin;
  }

  private async seedProperties() {
    this.logger.log('Seeding Properties...');
    const agents = await this.userRepo.find({ where: { role: UserRole.AGENT } });
    const properties: Property[] = [];

    for (let i = 0; i < 50; i++) {
      const agent = faker.helpers.arrayElement(agents);
      const property = this.propertyRepo.create({
        title: faker.lorem.words(4),
        description: faker.lorem.paragraphs(2),
        price: faker.number.int({ min: 10000000, max: 500000000 }),
        city: faker.location.city(),
        state: faker.location.state(),
        address: faker.location.streetAddress(),
        bedrooms: faker.number.int({ min: 1, max: 7 }),
        bathrooms: faker.number.int({ min: 1, max: 7 }),
        propertyType: faker.helpers.arrayElement(Object.values(PropertyType)),
        listingType: faker.helpers.arrayElement(Object.values(ListingType)),
        approvalStatus: faker.helpers.arrayElement([ApprovalStatus.APPROVED, ApprovalStatus.APPROVED, ApprovalStatus.PENDING, ApprovalStatus.REJECTED]), // Bias towards approved
        featured: faker.datatype.boolean(),
        createdBy: agent,
        createdById: agent.id,
      });

      const savedProp = await this.propertyRepo.save(property);

      // Images
      for (let j = 0; j < faker.number.int({ min: 2, max: 5 }); j++) {
        await this.imageRepo.save(
          this.imageRepo.create({
            propertyId: savedProp.id,
            imageUrl: faker.image.urlLoremFlickr({ category: 'house' }),
          })
        );
      }

      properties.push(savedProp);
    }

    return properties;
  }

  private async seedLeads(properties: Property[]) {
    this.logger.log('Seeding Leads...');
    const leads: Lead[] = [];

    for (let i = 0; i < 100; i++) {
      const property = faker.helpers.arrayElement(properties);
      const lead = this.leadRepo.create({
        propertyId: property.id,
        customerName: faker.person.fullName(),
        customerEmail: faker.internet.email(),
        customerPhone: faker.phone.number(),
        message: faker.lorem.sentences(2),
        status: faker.helpers.arrayElement(Object.values(LeadStatus)),
        score: faker.number.int({ min: 10, max: 99 }),
        priority: faker.helpers.arrayElement(Object.values(LeadPriority)),
        assignedAgentId: property.createdById,
      });
      leads.push(await this.leadRepo.save(lead));
    }

    return leads;
  }

  private async seedChats(leads: Lead[]) {
    this.logger.log('Seeding Chats...');
    const selectedLeads = faker.helpers.arrayElements(leads, 20);

    for (const lead of selectedLeads) {
      const conversation = await this.conversationRepo.save(
        this.conversationRepo.create({ leadId: lead.id })
      );

      const agentId = lead.assignedAgentId;

      for (let i = 0; i < 5; i++) {
        await this.messageRepo.save(
          this.messageRepo.create({
            conversationId: conversation.id,
            senderId: faker.datatype.boolean() ? agentId : undefined, // Undefined means from the buyer side via web chat
            content: faker.lorem.sentence(),
          })
        );
      }
    }
  }

  private async seedFavoritesAndNotifications(properties: Property[]) {
    this.logger.log('Seeding Favorites & Notifications...');
    const buyers = await this.userRepo.find({ where: { role: UserRole.BUYER } });

    // Favorites
    for (const buyer of buyers) {
      const favProps = faker.helpers.arrayElements(properties, faker.number.int({ min: 1, max: 5 }));
      for (const prop of favProps) {
        // Simple check to avoid dups in seeding
        const exists = await this.favoriteRepo.findOne({ where: { userId: buyer.id, propertyId: prop.id } });
        if (!exists) {
          await this.favoriteRepo.save(this.favoriteRepo.create({ userId: buyer.id, propertyId: prop.id }));
        }
      }

      // Notifications
      for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
        await this.notificationRepo.save(
          this.notificationRepo.create({
            userId: buyer.id,
            title: 'Welcome to Real Estate AI',
            message: 'Find your dream home today!',
            read: faker.datatype.boolean(),
          })
        );
      }
    }
  }
}

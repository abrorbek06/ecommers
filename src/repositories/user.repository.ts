import { PrismaClient, TelUser, Customer } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { NotFoundError, ConflictError } from '../core/errors';

export class UserRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findById(id: bigint): Promise<TelUser> {
    return this.handleDatabaseError('findById', async () => {
      const user = await this.prisma.telUser.findUnique({
        where: { id },
        include: { customer: true },
      });
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    });
  }

  async findByUsername(username: string): Promise<TelUser | null> {
    return this.handleDatabaseError('findByUsername', async () => {
      return this.prisma.telUser.findFirst({
        where: { username },
        include: { customer: true },
      });
    });
  }

  async create(data: {
    id: bigint;
    username?: string;
    language?: string;
    isAdmin?: boolean;
  }): Promise<TelUser> {
    return this.handleDatabaseError('create', async () => {
      return this.prisma.telUser.create({
        data,
        include: { customer: true },
      });
    });
  }

  async update(id: bigint, data: Partial<TelUser>): Promise<TelUser> {
    return this.handleDatabaseError('update', async () => {
      const user = await this.prisma.telUser.update({
        where: { id },
        data,
        include: { customer: true },
      });
      if (!user) {
        throw new NotFoundError('User');
      }
      return user;
    });
  }

  async createCustomer(data: {
    userId: bigint;
    fullName: string;
    phoneNumber: string;
    address?: string;
  }): Promise<Customer> {
    return this.handleDatabaseError('createCustomer', async () => {
      return this.prisma.customer.create({
        data,
      });
    });
  }

  async updateCustomer(userId: bigint, data: Partial<Customer>): Promise<Customer> {
    return this.handleDatabaseError('updateCustomer', async () => {
      const customer = await this.prisma.customer.update({
        where: { userId },
        data,
      });
      if (!customer) {
        throw new NotFoundError('Customer');
      }
      return customer;
    });
  }

  async getCustomerByUserId(userId: bigint): Promise<Customer | null> {
    return this.handleDatabaseError('getCustomerByUserId', async () => {
      return this.prisma.customer.findUnique({
        where: { userId },
      });
    });
  }
}

import { PrismaClient, Order, OrderItem, OrderHistory, OrderStatus } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { NotFoundError } from '../core/errors';
import { PaginationParams, PaginatedResponse } from '../core/types';

export class OrderRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findById(id: number): Promise<Order | null> {
    return this.handleDatabaseError('findById', async () => {
      return this.prisma.order.findUnique({
        where: { id },
        include: { items: true, history: true, user: true },
      });
    });
  }

  async findAll(params: PaginationParams = {}): Promise<PaginatedResponse<Order>> {
    return this.handleDatabaseError('findAll', async () => {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.order.findMany({
          skip,
          take: limit,
          orderBy: {
            [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
          },
          include: { items: true, history: true, user: true },
        }),
        this.prisma.order.count(),
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });
  }

  async findByUserId(userId: bigint): Promise<Order[]> {
    return this.handleDatabaseError('findByUserId', async () => {
      return this.prisma.order.findMany({
        where: { userId },
        include: { items: true, history: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async create(data: {
    userId?: bigint;
    fullName: string;
    phoneNumber: string;
    address?: string;
    totalAmount?: number;
    notes?: string;
    source?: string;
    telegramMessageId?: string;
  }): Promise<Order> {
    return this.handleDatabaseError('create', async () => {
      return this.prisma.order.create({
        data,
        include: { items: true, history: true, user: true },
      });
    });
  }

  async update(id: number, data: Partial<Order>): Promise<Order> {
    return this.handleDatabaseError('update', async () => {
      const order = await this.prisma.order.update({
        where: { id },
        data,
        include: { items: true, history: true, user: true },
      });
      if (!order) {
        throw new NotFoundError('Order');
      }
      return order;
    });
  }

  async updateStatus(
    id: number,
    newStatus: OrderStatus,
    changedBy?: string,
    changedById?: string,
    notes?: string
  ): Promise<Order> {
    return this.handleDatabaseError('updateStatus', async () => {
      const order = await this.prisma.order.findUnique({ where: { id } });
      if (!order) {
        throw new NotFoundError('Order');
      }

      const [updatedOrder] = await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id },
          data: { status: newStatus },
          include: { items: true, history: true, user: true },
        }),
        this.prisma.orderHistory.create({
          data: {
            orderId: id,
            oldStatus: order.status,
            newStatus,
            changedBy,
            changedById,
            notes,
          },
        }),
      ]);

      return updatedOrder;
    });
  }

  async addItem(data: {
    orderId: number;
    productId: number;
    quantity?: number;
    price?: number;
  }): Promise<OrderItem> {
    return this.handleDatabaseError('addItem', async () => {
      return this.prisma.orderItem.create({
        data,
        include: { product: true },
      });
    });
  }

  async addHistory(data: {
    orderId: number;
    oldStatus?: OrderStatus;
    newStatus: OrderStatus;
    changedBy?: string;
    changedById?: string;
    notes?: string;
  }): Promise<OrderHistory> {
    return this.handleDatabaseError('addHistory', async () => {
      return this.prisma.orderHistory.create({
        data,
      });
    });
  }
}

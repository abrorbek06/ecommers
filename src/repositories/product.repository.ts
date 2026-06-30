import { PrismaClient, Product, VehicleModel, ProductMedia } from '@prisma/client';
import { BaseRepository } from './base.repository';
import { NotFoundError } from '../core/errors';
import { PaginationParams, PaginatedResponse } from '../core/types';

export class ProductRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findById(id: number): Promise<Product | null> {
    return this.handleDatabaseError('findById', async () => {
      return this.prisma.product.findUnique({
        where: { id },
        include: { model: true, media: true },
      });
    });
  }

  async findAll(params: PaginationParams = {}): Promise<PaginatedResponse<Product>> {
    return this.handleDatabaseError('findAll', async () => {
      const page = params.page || 1;
      const limit = params.limit || 20;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.prisma.product.findMany({
          skip,
          take: limit,
          orderBy: {
            [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
          },
          include: { model: true, media: true },
        }),
        this.prisma.product.count(),
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

  async findByModelId(modelId: number): Promise<Product[]> {
    return this.handleDatabaseError('findByModelId', async () => {
      return this.prisma.product.findMany({
        where: { modelId },
        include: { model: true, media: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async create(data: {
    modelId: number;
    nameUz: string;
    nameRu: string;
    descUz?: string;
    descRu?: string;
    price?: number;
  }): Promise<Product> {
    return this.handleDatabaseError('create', async () => {
      return this.prisma.product.create({
        data,
        include: { model: true, media: true },
      });
    });
  }

  async update(id: number, data: Partial<Product>): Promise<Product> {
    return this.handleDatabaseError('update', async () => {
      const product = await this.prisma.product.update({
        where: { id },
        data,
        include: { model: true, media: true },
      });
      if (!product) {
        throw new NotFoundError('Product');
      }
      return product;
    });
  }

  async delete(id: number): Promise<Product> {
    return this.handleDatabaseError('delete', async () => {
      const product = await this.prisma.product.delete({
        where: { id },
        include: { model: true, media: true },
      });
      if (!product) {
        throw new NotFoundError('Product');
      }
      return product;
    });
  }

  async addMedia(data: {
    productId: number;
    fileId: string;
    mediaType?: string;
  }): Promise<ProductMedia> {
    return this.handleDatabaseError('addMedia', async () => {
      return this.prisma.productMedia.create({
        data,
      });
    });
  }

  async getModels(): Promise<VehicleModel[]> {
    return this.handleDatabaseError('getModels', async () => {
      return this.prisma.vehicleModel.findMany({
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async getModelById(id: number): Promise<VehicleModel | null> {
    return this.handleDatabaseError('getModelById', async () => {
      return this.prisma.vehicleModel.findUnique({
        where: { id },
      });
    });
  }
}

import prisma from '../database';
import { UserRepository } from './user.repository';
import { ProductRepository } from './product.repository';
import { OrderRepository } from './order.repository';

export const userRepository = new UserRepository(prisma);
export const productRepository = new ProductRepository(prisma);
export const orderRepository = new OrderRepository(prisma);

export { UserRepository, ProductRepository, OrderRepository };

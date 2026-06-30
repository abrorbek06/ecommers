import api from './api';

// Types
export interface Product {
  id: number;
  name: string;
  nameUz: string;
  nameRu: string;
  description?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  price: number | null;
  model: {
    id: number;
    name: string;
  };
  media: Array<{
    id: number;
    fileId: string;
    type: string;
  }>;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  nameUz: string;
  nameRu: string;
  productCount: number;
  createdAt: string;
}

export interface Order {
  id: number;
  fullName: string;
  phoneNumber: string;
  quantity: number;
  status: string;
  notes?: string;
  createdAt: string;
  product: {
    id: number;
    name: string;
    nameUz: string;
    nameRu: string;
    description?: string;
    descriptionUz?: string;
    descriptionRu?: string;
    price: number | null;
    model: {
      id: number;
      name: string;
    };
    media?: Array<{
      id: number;
      fileId: string;
      type: string;
    }>;
  };
}

export interface User {
  id: string;
  username?: string;
  language: string;
  isAdmin: boolean;
  customer?: {
    fullName: string;
    phoneNumber: string;
  };
}

// API Functions
export const apiService = {
  // Categories
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
  },

  // Products
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    categoryId?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProduct: async (id: number): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getFeaturedProducts: async (limit?: number): Promise<Product[]> => {
    const response = await api.get('/products/featured', { params: { limit } });
    return response.data;
  },

  searchProducts: async (query: string, limit?: number): Promise<Product[]> => {
    const response = await api.get('/search', { params: { q: query, limit } });
    return response.data;
  },

  // Orders
  createOrder: async (data: {
    userId?: string;
    items: Array<{ productId: number; quantity: number }>;
    fullName: string;
    phoneNumber: string;
    notes?: string;
  }) => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  getUserOrders: async (userId: string): Promise<Order[]> => {
    const response = await api.get(`/orders/user/${userId}`);
    return response.data;
  },

  getOrder: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // User
  getUserProfile: async (userId: string): Promise<User> => {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  },

  updateUserProfile: async (
    userId: string,
    data: { fullName?: string; phoneNumber?: string; language?: string }
  ) => {
    const response = await api.put(`/user/${userId}`, data);
    return response.data;
  },
};

export default apiService;
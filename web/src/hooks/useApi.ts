import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../lib/services';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: apiService.getCategories,
  });
};

export const useProducts = (params?: {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => apiService.getProducts(params),
    staleTime: 0, // Always refetch when params change
  });
};

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => apiService.getProduct(id),
    enabled: !!id,
  });
};

export const useFeaturedProducts = (limit?: number) => {
  return useQuery({
    queryKey: ['featured-products', limit],
    queryFn: () => apiService.getFeaturedProducts(limit),
  });
};

export const useSearchProducts = (query: string, limit?: number) => {
  return useQuery({
    queryKey: ['search', query, limit],
    queryFn: () => apiService.searchProducts(query, limit),
    enabled: !!query,
  });
};

export const useUserOrders = (userId?: string) => {
  return useQuery({
    queryKey: ['user-orders', userId],
    queryFn: () => apiService.getUserOrders(userId!),
    enabled: !!userId,
  });
};

export const useOrder = (id: number) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => apiService.getOrder(id),
    enabled: !!id,
  });
};

export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => apiService.getUserProfile(userId!),
    enabled: !!userId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiService.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => 
      apiService.updateUserProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
};
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Query keys for different entities
export const queryKeys = {
  users: ["users"] as const,
  user: (id: string) => ["users", id] as const,
  profiles: ["profiles"] as const,
  profile: (id: string) => ["profiles", id] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  products: ["products"] as const,
  product: (id: string) => ["products", id] as const,
  categories: ["categories"] as const,
  category: (id: string) => ["categories", id] as const,
};

// Generic fetch function for any table
export function useFetchData<T>(
  table: string,
  queryKey: readonly unknown[],
  options?: {
    columns?: string;
    filter?: Record<string, any>;
    order?: { column: string; ascending?: boolean };
    limit?: number;
    single?: boolean;
    range?: [number, number];
    enabled?: boolean;
  }
) {
  const supabase = createClient();
  
  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      let query = supabase.from(table).select(options?.columns || "*");
      
      // Apply filters if provided
      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      // Apply ordering if provided
      if (options?.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true,
        });
      }
      
      // Apply limit if provided
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      // Apply range if provided
      if (options?.range) {
        query = query.range(options.range[0], options.range[1]);
      }
      
      // Get single record or multiple
      const { data, error } = options?.single
        ? await query.single()
        : await query;
      
      if (error) {
        throw error;
      }
      
      return data as T;
    },
    enabled: options?.enabled !== false,
  });
}

// Generic mutation function for inserting data
export function useInsertData<T>(table: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation<T, Error, Partial<T>>({
    mutationFn: async (newData) => {
      const { data, error } = await supabase
        .from(table)
        .insert(newData)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as T;
    },
    onSuccess: (data, variables, context) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [table] });
      toast.success(`${table} created successfully`);
    },
    onError: (error) => {
      toast.error(`Error creating ${table}: ${error.message}`);
    },
  });
}

// Generic mutation function for updating data
export function useUpdateData<T>(table: string, id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation<T, Error, Partial<T>>({
    mutationFn: async (updatedData) => {
      const { data, error } = await supabase
        .from(table)
        .update(updatedData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as T;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: [table, id] });
      toast.success(`${table} updated successfully`);
    },
    onError: (error) => {
      toast.error(`Error updating ${table}: ${error.message}`);
    },
  });
}

// Generic mutation function for deleting data
export function useDeleteData(table: string, id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);
      
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: [table, id] });
      toast.success(`${table} deleted successfully`);
    },
    onError: (error) => {
      toast.error(`Error deleting ${table}: ${error.message}`);
    },
  });
}

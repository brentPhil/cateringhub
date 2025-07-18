"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  QueryOptions,
  SupabaseError,
  TableName
} from "@/types";

const IS_DEV = process.env.NODE_ENV !== "production";

// Query keys for actual database entities - following established patterns
export const queryKeys = {
  // Generic table queries
  table: (tableName: TableName) => [tableName] as const,
  tableItem: (tableName: TableName, id: string) => [tableName, id] as const,
} as const;

// Generic fetch function for any table - following Supabase patterns
export function useFetchData<T = unknown>(
  table: TableName,
  queryKey: readonly unknown[],
  options?: QueryOptions & {
    enabled?: boolean;
    select?: (data: unknown) => T;
  }
) {
  const supabase = createClient();

  return useQuery<T, SupabaseError>({
    queryKey,
    queryFn: async (): Promise<T> => {
      try {
        let query = supabase.from(table).select(options?.columns || "*");

        // Apply filters if provided
        if (options?.filter) {
          Object.entries(options.filter).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('ilike.')) {
              query = query.ilike(key, value.replace('ilike.', ''));
            } else if (typeof value === 'string' && value.startsWith('in.')) {
              const values = value.replace('in.', '').split(',');
              query = query.in(key, values);
            } else {
              query = query.eq(key, value);
            }
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

        return options?.select ? options.select(data) : (data as T);
      } catch (error) {
        throw error;
      }
    },
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds - following auth hooks pattern
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Limit retries like auth hooks
  });
}

// Generic mutation function for inserting data - improved error handling
export function useInsertData<T>(table: TableName) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<T, SupabaseError, Partial<T>>({
    mutationFn: async (newData) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .insert(newData)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data as T;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries - following auth hooks pattern
      queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      toast.success(`${table} created successfully`);
    },
    onError: (error) => {
      toast.error(`Error creating ${table}: ${error.message}`);
    },
  });
}

// Generic mutation function for updating data - improved error handling
export function useUpdateData<T>(table: TableName, id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<T, SupabaseError, Partial<T>>({
    mutationFn: async (updatedData) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .update(updatedData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error(`Error updating data in ${table}:`, error);
          throw error;
        }

        return data as T;
      } catch (error) {
        console.error(`Update mutation failed for table ${table}:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries - following auth hooks pattern
      queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tableItem(table, id) });
      toast.success(`${table} updated successfully`);
    },
    onError: (error) => {
      console.error(`Update mutation error for ${table}:`, error);
      toast.error(`Error updating ${table}: ${error.message}`);
    },
  });
}

// Generic mutation function for deleting data - improved error handling
export function useDeleteData(table: TableName, id: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<void, SupabaseError, void>({
    mutationFn: async () => {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries - following auth hooks pattern
      queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tableItem(table, id) });
      toast.success(`${table} deleted successfully`);
    },
    onError: (error) => {
      toast.error(`Error deleting ${table}: ${error.message}`);
    },
  });
}

// Specialized hooks were removed in favor of using `useFetchData` directly.



// Utility hooks for common operations

// Batch operations for better performance
export function useBatchInsertData<T>(table: TableName) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<T[], SupabaseError, Partial<T>[]>({
    mutationFn: async (newDataArray) => {
      try {
        const { data, error } = await supabase
          .from(table)
          .insert(newDataArray)
          .select();

        if (error) {
          throw error;
        }

        return data as T[];
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      toast.success(`${table} records created successfully`);
    },
    onError: (error) => {
      toast.error(`Error creating ${table} records: ${error.message}`);
    },
  });
}

// Real-time subscription hook (optional feature) - simplified for compatibility
export function useRealtimeSubscription<T>(
  table: TableName,
  options?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onInsert?: (payload: T) => void;
    onUpdate?: (payload: T) => void;
    onDelete?: (payload: { old_record: T }) => void;
    enabled?: boolean;
  }
) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["realtime", table, options?.event, options?.filter],
    queryFn: async () => {
      if (options?.enabled === false) return null;

      try {
        // Set up real-time subscription
        const channel = supabase
          .channel(`${table}_changes`)
          .on(
            'postgres_changes' as any,
            {
              event: options?.event || '*',
              schema: 'public',
              table: table,
              filter: options?.filter
            } as any,
            (payload: any) => {
              if (IS_DEV) {
                console.log(`Real-time change in ${table}:`, payload);
              }

              // Invalidate relevant queries to refetch data
              queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });

              // Call specific event handlers
              if (payload.eventType === 'INSERT' && options?.onInsert) {
                options.onInsert(payload.new as T);
              } else if (payload.eventType === 'UPDATE' && options?.onUpdate) {
                options.onUpdate(payload.new as T);
              } else if (payload.eventType === 'DELETE' && options?.onDelete) {
                options.onDelete({ old_record: payload.old as T });
              }
            }
          )
          .subscribe();

        return { channel, subscribed: true };
      } catch (error) {
        console.error(`Error setting up real-time subscription for ${table}:`, error);
        return null;
      }
    },
    enabled: options?.enabled !== false,
    staleTime: Infinity, // Never stale for real-time
    gcTime: Infinity, // Keep in cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
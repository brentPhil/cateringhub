"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

const IS_DEV = process.env.NODE_ENV !== "production";

type PublicTable = keyof Database["public"]["Tables"];
type TableRow<Table extends PublicTable> = Database["public"]["Tables"][Table]["Row"];
type TableInsert<Table extends PublicTable> = Database["public"]["Tables"][Table]["Insert"];
type TableUpdate<Table extends PublicTable> = Database["public"]["Tables"][Table]["Update"];
type TableId<Table extends PublicTable> = TableRow<Table> extends { id: infer Id }
  ? [Extract<Id, string | number>] extends [never]
    ? string | number
    : Extract<Id, string | number>
  : string | number;
type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type PostgresChangesFilter<Event extends PostgresChangeEvent> = {
  event: Event;
  schema: 'public';
  table?: string;
  filter?: string;
};
type QueryOptions<Table extends PublicTable> = {
  columns?: string;
  filter?: Partial<Record<keyof TableRow<Table>, TableRow<Table>[keyof TableRow<Table>] | string>>;
  order?: {
    column: keyof TableRow<Table>;
    ascending?: boolean;
  };
  limit?: number;
  single?: boolean;
  range?: [number, number];
  enabled?: boolean;
};
type FetchResult<Table extends PublicTable, Single extends boolean | undefined> =
  Single extends true ? TableRow<Table> : TableRow<Table>[];
type FetchOptions<Table extends PublicTable, Single extends boolean | undefined, Selected> =
  QueryOptions<Table> & {
    enabled?: boolean;
    single?: Single;
    select?: (data: FetchResult<Table, Single>) => Selected;
  };
type RealtimePayload<Table extends PublicTable> = RealtimePostgresChangesPayload<TableRow<Table>>;

// Query keys for actual database entities - following established patterns
export const queryKeys = {
  // Generic table queries
  table: (tableName: PublicTable) => [tableName] as const,
  tableItem: (tableName: PublicTable, id: string | number) => [tableName, id] as const,
} as const;

// Generic fetch function for any table - following Supabase patterns
export function useFetchData<Table extends PublicTable, Single extends boolean | undefined = false, Selected = FetchResult<Table, Single>>(
  table: Table,
  queryKey: readonly unknown[],
  options?: FetchOptions<Table, Single, Selected>
) {
  const supabase = createClient();

  return useQuery<Selected>({
    queryKey,
    queryFn: async (): Promise<Selected> => {
      let query = supabase.from(table).select(options?.columns || "*");

      const filters = options?.filter;
      if (filters) {
        (Object.entries(filters) as Array<[keyof TableRow<Table> & string, unknown]>).forEach(
          ([column, value]) => {
            if (typeof value === "undefined") return;

            if (typeof value === "string" && value.startsWith("ilike.")) {
              query = query.ilike(column, value.replace("ilike.", ""));
            } else if (typeof value === "string" && value.startsWith("in.")) {
              const values = value.replace("in.", "").split(",") as unknown as Parameters<typeof query.in>[1];
              query = query.in(column, values);
            } else {
              query = query.eq(column, value as Parameters<typeof query.eq>[1]);
            }
          }
        );
      }

      if (options?.order) {
        const column = options.order.column as string;
        query = query.order(column, {
          ascending: options.order.ascending ?? true,
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.range) {
        query = query.range(options.range[0], options.range[1]);
      }

      const { data, error } = options?.single ? await query.single() : await query;

      if (error) {
        throw error;
      }

      const typedData = data as unknown as FetchResult<Table, Single>;
      return options?.select ? options.select(typedData) : (typedData as Selected);
    },
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds - following auth hooks pattern
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Limit retries like auth hooks
  });
}

// Generic mutation function for inserting data - improved error handling
export function useInsertData<Table extends PublicTable>(table: Table) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<TableRow<Table>, Error, TableInsert<Table>>({
    mutationFn: async (newData: TableInsert<Table>) => {
      const { data, error } = await supabase
        .from(table)
        .insert(newData as never)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as unknown as TableRow<Table>;
    },
    onSuccess: () => {
      // Invalidate relevant queries - following auth hooks pattern
      void queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      toast.success(`${table} created successfully`);
    },
    onError: (error) => {
      toast.error(`Error creating ${table}: ${error.message}`);
    },
  });
}

// Generic mutation function for updating data - improved error handling
export function useUpdateData<Table extends PublicTable>(table: Table, id: TableId<Table>) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<TableRow<Table>, Error, TableUpdate<Table>>({
    mutationFn: async (updatedData: TableUpdate<Table>) => {
      const { data, error } = await supabase
        .from(table)
        .update(updatedData as never)
        .eq("id", id as never)
        .select()
        .single();

      if (error) {
        console.error(`Error updating data in ${table}:`, error);
        throw error;
      }

      return data as unknown as TableRow<Table>;
    },
    onSuccess: () => {
      // Invalidate relevant queries - following auth hooks pattern
      void queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tableItem(table, id) });
      toast.success(`${table} updated successfully`);
    },
    onError: (error) => {
      console.error(`Update mutation error for ${table}:`, error);
      toast.error(`Error updating ${table}: ${error.message}`);
    },
  });
}

// Generic mutation function for deleting data - improved error handling
export function useDeleteData<Table extends PublicTable>(table: Table, id: TableId<Table>) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id as never);

        if (error) {
          throw error;
        }
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries - following auth hooks pattern
      void queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tableItem(table, id) });
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
export function useBatchInsertData<Table extends PublicTable>(table: Table) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation<TableRow<Table>[], Error, TableInsert<Table>[]>({
    mutationFn: async (newDataArray: TableInsert<Table>[]) => {
      const { data, error } = await supabase
        .from(table)
        .insert(newDataArray as never)
        .select();

      if (error) {
        throw error;
      }

      return data as unknown as TableRow<Table>[];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });
      toast.success(`${table} records created successfully`);
    },
    onError: (error) => {
      toast.error(`Error creating ${table} records: ${error.message}`);
    },
  });
}

// Real-time subscription hook (optional feature) - simplified for compatibility
export function useRealtimeSubscription<Table extends PublicTable>(
  table: Table,
  options?: {
    event?: PostgresChangeEvent;
    filter?: string;
    onInsert?: (payload: TableRow<Table>) => void;
    onUpdate?: (payload: TableRow<Table>) => void;
    onDelete?: (payload: Partial<TableRow<Table>>) => void;
    enabled?: boolean;
  }
) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useQuery<RealtimeChannel | null>({
    queryKey: ["realtime", table, options?.event, options?.filter],
    queryFn: () => {
      if (options?.enabled === false) return Promise.resolve(null);

      try {
        const event: PostgresChangeEvent = options?.event ?? '*';
        const filter: PostgresChangesFilter<PostgresChangeEvent> = {
          event,
          schema: 'public',
          table,
          filter: options?.filter,
        };

        const handlePayload = (payload: RealtimePayload<Table>) => {
          if (IS_DEV) {
            console.log(`Real-time change in ${table}:`, payload);
          }

          void queryClient.invalidateQueries({ queryKey: queryKeys.table(table) });

          if (payload.eventType === 'INSERT' && payload.new && options?.onInsert) {
            options.onInsert(payload.new);
          } else if (payload.eventType === 'UPDATE' && payload.new && options?.onUpdate) {
            options.onUpdate(payload.new);
          } else if (payload.eventType === 'DELETE' && payload.old && options?.onDelete) {
            options.onDelete(payload.old);
          }
        };

        const channel = supabase.channel(`${table}_changes`);

        if (event === 'INSERT') {
          channel.on(
            'postgres_changes',
            filter as PostgresChangesFilter<'INSERT'>,
            handlePayload
          );
        } else if (event === 'UPDATE') {
          channel.on(
            'postgres_changes',
            filter as PostgresChangesFilter<'UPDATE'>,
            handlePayload
          );
        } else if (event === 'DELETE') {
          channel.on(
            'postgres_changes',
            filter as PostgresChangesFilter<'DELETE'>,
            handlePayload
          );
        } else {
          channel.on(
            'postgres_changes',
            filter as PostgresChangesFilter<'*'>,
            handlePayload
          );
        }

        void channel.subscribe();

        return Promise.resolve(channel);
      } catch (error) {
        console.error(`Error setting up real-time subscription for ${table}:`, error);
        return Promise.resolve(null);
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

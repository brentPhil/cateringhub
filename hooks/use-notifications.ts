"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { createClient } from "@/lib/supabase/client"; // TODO: Uncomment when notifications table is ready
import { toast } from "sonner";

// Define notification type
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Query keys for notifications
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...notificationKeys.lists(), { ...filters }] as const,
  details: () => [...notificationKeys.all, "detail"] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
};

// Get all notifications for the current user
export function useNotifications() {
  // const supabase = createClient(); // TODO: Implement when notifications table is ready

  return useQuery({
    queryKey: notificationKeys.lists(),
    queryFn: async () => {
      // In a real implementation, you would fetch from a notifications table
      // For now, we'll use placeholder data
      const mockNotifications: Notification[] = [
        {
          id: "1",
          user_id: "current-user",
          title: "Welcome to CateringHub",
          message: "Thank you for joining CateringHub. Get started by exploring the dashboard.",
          read: false,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
        {
          id: "2",
          user_id: "current-user",
          title: "Profile Updated",
          message: "Your profile information has been successfully updated.",
          read: true,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        },
        {
          id: "3",
          user_id: "current-user",
          title: "New Feature Available",
          message: "Check out our new menu planning feature to streamline your catering operations.",
          read: false,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        },
      ];
      
      return mockNotifications;
      
      // When you have a notifications table, use this instead:
      /*
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data as Notification[];
      */
    },
  });
}

// Mark a notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  // const supabase = createClient(); // TODO: Implement when notifications table is ready

  return useMutation({
    mutationFn: async (_id: string) => {
      // In a real implementation, you would update the notifications table
      // For now, we'll just simulate success
      
      // When you have a notifications table, use this instead:
      /*
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
        
      if (error) {
        throw error;
      }
      */
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    },
    onSuccess: (_, id) => {
      // Update the cache to mark the notification as read
      queryClient.setQueryData(
        notificationKeys.lists(),
        (oldData: Notification[] | undefined) => {
          if (!oldData) return [];
          
          return oldData.map(notification => 
            notification.id === id 
              ? { ...notification, read: true } 
              : notification
          );
        }
      );
      
      toast.success("Notification marked as read");
    },
    onError: (error) => {
      toast.error(`Error marking notification as read: ${error.message}`);
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  // const supabase = createClient(); // TODO: Implement when notifications table is ready
  
  return useMutation({
    mutationFn: async () => {
      // In a real implementation, you would update the notifications table
      // For now, we'll just simulate success
      
      // When you have a notifications table, use this instead:
      /*
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false);
        
      if (error) {
        throw error;
      }
      */
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    },
    onSuccess: () => {
      // Update the cache to mark all notifications as read
      queryClient.setQueryData(
        notificationKeys.lists(),
        (oldData: Notification[] | undefined) => {
          if (!oldData) return [];
          
          return oldData.map(notification => ({ ...notification, read: true }));
        }
      );
      
      toast.success("All notifications marked as read");
    },
    onError: (error) => {
      toast.error(`Error marking all notifications as read: ${error.message}`);
    },
  });
}

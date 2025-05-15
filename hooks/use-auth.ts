"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Query keys
export const authKeys = {
  user: ["user"] as const,
  profile: (userId: string) => ["profile", userId] as const,
};

// Get current user
export function useUser() {
  const supabase = createClient();
  
  return useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        throw error;
      }
      
      return data.user;
    },
  });
}

// Get user profile
export function useProfile() {
  const supabase = createClient();
  const { data: user, isLoading: isUserLoading } = useUser();
  
  return useQuery({
    queryKey: user ? authKeys.profile(user.id) : authKeys.profile("unknown"),
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    enabled: !!user && !isUserLoading,
  });
}

// Sign out
export function useSignOut() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and reset relevant queries
      queryClient.invalidateQueries({ queryKey: authKeys.user });
      queryClient.resetQueries();
      
      // Redirect to login page
      router.push("/login");
      router.refresh();
      
      toast.success("Signed out successfully");
    },
    onError: (error) => {
      toast.error(`Error signing out: ${error.message}`);
    },
  });
}

// Get user role
export function useUserRole() {
  const supabase = createClient();
  const { data: user } = useUser();
  
  return useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Get the JWT and decode it
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;
      
      const token = sessionData.session.access_token;
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      
      return decoded.user_role || 'user';
    },
    enabled: !!user,
  });
}

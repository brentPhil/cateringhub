"use client";

import { 
  useNotifications, 
  useMarkNotificationAsRead, 
  useMarkAllNotificationsAsRead 
} from "@/hooks/use-notifications";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BellIcon, 
  CheckIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  ClockIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function NotificationsClient() {
  const { data: notifications, isLoading, isError, error } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  
  // Count unread notifications
  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  
  // Handle marking a notification as read
  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };
  
  // Handle marking all notifications as read
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
        
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load notifications"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
              {unreadCount} new
            </span>
          )}
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
          >
            {markAllAsRead.isPending ? (
              <>
                <ClockIcon className="mr-2 h-4 w-4 animate-spin" />
                Marking all as read...
              </>
            ) : (
              <>
                <CheckIcon className="mr-2 h-4 w-4" />
                Mark all as read
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={notification.read ? "opacity-80 hover:opacity-100 transition-opacity" : ""}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-2 rounded-full ${notification.read ? "bg-muted" : "bg-primary/10"}`}>
                  <BellIcon className={`h-5 w-5 ${notification.read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                      {notification.title}
                      {!notification.read && (
                        <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-primary"></span>
                      )}
                    </CardTitle>
                    <Typography variant="smallText" className="text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Typography>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Typography variant="smallText">{notification.message}</Typography>
              </CardContent>
              {!notification.read && (
                <CardFooter className="flex justify-end pt-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsRead.isPending}
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Mark as read
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Mark this notification as read</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardFooter>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <BellIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <Typography variant="lead" className="text-center">
                No notifications yet
              </Typography>
              <Typography variant="smallText" className="text-muted-foreground text-center">
                When you receive notifications, they will appear here.
              </Typography>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

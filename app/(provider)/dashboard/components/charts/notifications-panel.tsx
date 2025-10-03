"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle, Info, CheckCircle2 } from "lucide-react";

export interface Notification {
  id: string | number;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  time: string;
  isRead?: boolean;
}

interface NotificationsPanelProps {
  title?: string;
  subtitle?: string;
  notifications: Notification[];
  onMarkAsRead?: (id: string | number) => void;
  onClearAll?: () => void;
}

const notificationIcons = {
  info: Info,
  warning: AlertCircle,
  success: CheckCircle2,
  error: AlertCircle,
};

const notificationColors = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  success: "text-green-500",
  error: "text-red-500",
};

export function NotificationsPanel({
  title = "Notifications",
  subtitle = "Recent alerts",
  notifications,
  onMarkAsRead,
  onClearAll,
}: NotificationsPanelProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <div>
              <CardTitle>{title}</CardTitle>
              <Typography variant="mutedText">{subtitle}</Typography>
            </div>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <Typography variant="mutedText">No notifications</Typography>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const iconColor = notificationColors[notification.type];

              return (
                <li
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-md border ${
                    notification.isRead ? "bg-background" : "bg-muted/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-1 flex-shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <Typography className="font-medium">{notification.title}</Typography>
                      {!notification.isRead && (
                        <Badge variant="secondary" className="flex-shrink-0 text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <Typography variant="smallText" className="text-muted-foreground">
                      {notification.message}
                    </Typography>
                    <div className="flex items-center justify-between">
                      <Typography variant="smallText" className="text-muted-foreground">
                        {notification.time}
                      </Typography>
                      {!notification.isRead && onMarkAsRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => onMarkAsRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


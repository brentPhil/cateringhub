"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  StickyNote,
  Activity,
  Plus,
  Save,
  X,
  User,
  Clock,
  Edit,
  Trash2,
  CheckCircle,
  UserPlus,
  DollarSign,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import type {
  BookingDetailData,
  BookingDetailCapabilities,
} from "../../hooks/use-booking-detail";

interface NotesActivityCardProps {
  booking: BookingDetailData;
  capabilities: BookingDetailCapabilities;
}

// Mock activity data - in real implementation, this would come from audit_logs
interface ActivityEvent {
  id: string;
  action: string;
  resourceType: string;
  userName: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Mock notes data - in real implementation, this would be stored in database
interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// Activity icon mapping
const getActivityIcon = (action: string) => {
  if (action.includes("created")) return Plus;
  if (action.includes("updated") || action.includes("edited")) return Edit;
  if (action.includes("deleted")) return Trash2;
  if (action.includes("confirmed")) return CheckCircle;
  if (action.includes("assigned")) return UserPlus;
  if (action.includes("payment")) return DollarSign;
  if (action.includes("venue")) return MapPin;
  return Activity;
};

// Activity color mapping
const getActivityColor = (action: string) => {
  if (action.includes("created")) return "text-primary";
  if (action.includes("updated") || action.includes("edited"))
    return "text-primary";
  if (action.includes("deleted")) return "text-destructive";
  if (action.includes("confirmed")) return "text-primary";
  if (action.includes("assigned")) return "text-primary";
  return "text-muted-foreground";
};

// Activity background color mapping
const getActivityBgColor = (action: string) => {
  if (action.includes("created")) return "bg-primary/10";
  if (action.includes("updated") || action.includes("edited"))
    return "bg-primary/10";
  if (action.includes("deleted")) return "bg-destructive/10";
  if (action.includes("confirmed")) return "bg-primary/10";
  if (action.includes("assigned")) return "bg-primary/10";
  return "bg-muted";
};

export function NotesActivityCard({
  booking,
  capabilities,
}: NotesActivityCardProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const canEdit = capabilities.canEdit && booking.status !== "cancelled";

  // Mock data - replace with actual API calls
  const mockNotes: Note[] = [
    {
      id: "1",
      content:
        "Customer requested vegetarian menu options. Confirmed with chef.",
      createdBy: "John Doe",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "2",
      content:
        "Venue has limited parking. Advised customer to arrange shuttle service.",
      createdBy: "Jane Smith",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const mockActivity: ActivityEvent[] = [
    {
      id: "1",
      action: "booking_created",
      resourceType: "booking",
      userName: "System",
      timestamp: booking.created_at,
    },
    {
      id: "2",
      action: "team_member_assigned",
      resourceType: "shift",
      userName: "Admin User",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      details: { memberName: "John Doe", role: "Chef" },
    },
    {
      id: "3",
      action: "booking_confirmed",
      resourceType: "booking",
      userName: "Supervisor",
      timestamp:
        booking.confirmed_at ||
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      action: "logistics_updated",
      resourceType: "booking",
      userName: "Staff Member",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      details: { field: "venue_address" },
    },
  ];

  const handleSaveNote = () => {
    // TODO: Implement actual note saving
    console.log("Saving note:", noteContent);
    setNoteContent("");
    setIsAddingNote(false);
  };

  const handleCancelNote = () => {
    setNoteContent("");
    setIsAddingNote(false);
  };

  const formatActivityMessage = (event: ActivityEvent) => {
    const action = event.action.replace(/_/g, " ");
    let message = action.charAt(0).toUpperCase() + action.slice(1);

    if (event.details) {
      if (event.details.memberName) {
        message += ` - ${event.details.memberName}`;
        if (event.details.role) {
          message += ` (${event.details.role})`;
        }
      } else if (event.details.field) {
        message += ` - ${event.details.field}`;
      }
    }

    return message;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes & activity</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 p-1 rounded-md bg-muted/50">
            <TabsTrigger
              value="notes"
              className="flex items-center justify-center gap-2 py-2 text-sm"
            >
              <StickyNote className="h-4 w-4" />
              Notes
              <Badge variant="outline" className="ml-1">
                {mockNotes.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="flex items-center justify-center gap-2 py-2 text-sm"
            >
              <Activity className="h-4 w-4" />
              Activity
              <Badge variant="outline" className="ml-1">
                {mockActivity.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            {/* Add note button */}
            {canEdit && !isAddingNote && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNote(true)}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add note
              </Button>
            )}

            {/* Add note form */}
            {isAddingNote && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <Textarea
                  placeholder="Enter your note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelNote}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNote}
                    disabled={!noteContent.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save note
                  </Button>
                </div>
              </div>
            )}

            {/* Notes list */}
            {mockNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/20">
                <StickyNote className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold mb-1">No notes yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Add notes to keep track of important information about this
                  booking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {note.createdBy}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(note.createdAt), "MMM dd, h:mm a")}
                      </div>
                    </div>
                    <p className="text-sm">{note.content}</p>
                    {note.updatedAt && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Edited{" "}
                        {format(new Date(note.updatedAt), "MMM dd, h:mm a")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            {mockActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/20">
                <Activity className="h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-sm font-semibold mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Activity history will appear here as changes are made to this
                  booking.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockActivity.map((event, index) => {
                  const Icon = getActivityIcon(event.action);
                  const isLast = index === mockActivity.length - 1;

                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline connector */}
                      {!isLast && (
                        <div
                          className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border"
                          aria-hidden="true"
                        />
                      )}

                      {/* Activity event */}
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`rounded-lg p-2 ${getActivityBgColor(
                            event.action
                          )}`}
                        >
                          <Icon
                            className={`h-4 w-4 ${getActivityColor(
                              event.action
                            )}`}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <div className="text-sm font-medium">
                                {formatActivityMessage(event)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                by {event.userName}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(
                                new Date(event.timestamp),
                                "MMM dd, h:mm a"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

"use client";

import { useCurrentMembership } from "@/hooks/use-membership";
import { useBookingDetail } from "../../hooks/use-booking-detail";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AlertCircle,
  ArrowLeft,
  Info,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useIsMobile } from "@/hooks/use-mobile";
import { BookingHeroCard } from "./booking-hero-card";
import { CustomerInfoCard } from "./customer-info-card";
import { CommunicationsTimeline } from "./communications-timeline";
import { EventLogisticsCard } from "./event-logistics-card";
import { StaffingShiftsCard } from "./staffing-shifts-card";
import { FinancialsCard } from "./financials-card";
import { NotesActivityCard } from "./notes-activity-card";
import { WorkflowActionsBar } from "./workflow-actions-bar";
import { TeamLocationCard } from "./team-location-card";

interface BookingDetailClientProps {
  bookingId: string;
}

export function BookingDetailClient({ bookingId }: BookingDetailClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Tab state management with nuqs - MUST be at top before any conditional returns
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "overview",
  });

  // Compute tab value: on desktop, coerce "overview" to "team" since overview is sidebar-only
  const isDesktop = !isMobile;
  const tabValue =
    isDesktop && activeTab === "overview" ? "team" : (activeTab ?? "team");

  // Get current user's membership
  const { data: membership, isLoading: membershipLoading } =
    useCurrentMembership();
  const providerId = membership?.providerId;

  // Fetch booking details
  const {
    data: bookingResponse,
    isLoading: bookingLoading,
    error: bookingError,
  } = useBookingDetail(providerId, bookingId);

  // Show message if user doesn't have a provider membership
  if (!membership && !membershipLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking details</h1>
          <p className="text-muted-foreground">
            View and manage booking information
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No provider membership found
          </h3>
          <p className="text-muted-foreground max-w-md">
            You need to be a member of a provider organization to access
            bookings. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (membershipLoading || bookingLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Loading booking...
            </h1>
          </div>
        </div>
        <LoadingState variant="card" count={3} />
      </div>
    );
  }

  // Error state
  if (bookingError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/bookings")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Booking details
            </h1>
          </div>
        </div>
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8">
          <div className="flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Failed to load booking
              </h3>
              <p className="text-sm text-muted-foreground">
                {(bookingError as Error)?.message ||
                  "An error occurred while fetching booking details."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/bookings")}
              className="mt-2"
            >
              Back to bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!bookingResponse?.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/bookings")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Booking not found
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Booking not found</h3>
          <p className="text-muted-foreground max-w-md mb-4">
            The booking you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/bookings")}
          >
            Back to bookings
          </Button>
        </div>
      </div>
    );
  }

  const { data: booking, capabilities } = bookingResponse;

  // Action handlers (placeholders for future implementation)
  const handleAssignTeam = () => {
    // TODO: Open assign team dialog
    console.log("Assign team clicked");
  };

  const handleEditBooking = () => {
    // TODO: Open edit logistics dialog
    console.log("Edit booking clicked");
  };

  const handleManageBilling = () => {
    // TODO: Navigate to billing section or open billing dialog
    console.log("Manage billing clicked");
  };

  const handleConfirm = () => {
    // TODO: Confirm booking (update status to confirmed)
    console.log("Confirm booking clicked");
  };

  const handleCancel = () => {
    // TODO: Cancel booking (update status to cancelled)
    console.log("Cancel booking clicked");
  };

  const handleComplete = () => {
    // TODO: Complete booking (update status to completed)
    console.log("Complete booking clicked");
  };

  const handleSendUpdate = () => {
    // TODO: Send update email to customer
    console.log("Send update clicked");
  };

  const handleReschedule = () => {
    // TODO: Open reschedule dialog
    console.log("Reschedule clicked");
  };

  const handleDelete = () => {
    // TODO: Delete booking (with confirmation)
    console.log("Delete booking clicked");
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Booking details</h1>
          <p className="text-sm text-muted-foreground">
            View and manage booking information
          </p>
        </div>
      </div>

      {/* Desktop: 2-column layout with sidebar | Mobile: stacked layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
        {/* Main content area - Left side on desktop (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Phase 2: Hero Card - Always visible */}
          <BookingHeroCard booking={booking} />

          {/* Tabbed content - Phases 3-8 */}
          <Tabs value={tabValue} onValueChange={setActiveTab}>
            {/* Mobile: 4 tabs | Desktop: 3 tabs (no Overview) */}
            <TabsList>
              {/* Overview tab - only visible on mobile */}
              <TabsTrigger value="overview" className="gap-2 text-sm lg:hidden">
                <Info className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span>Team & shifts</span>
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                <span>Financials</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2 text-sm">
                <Activity className="h-4 w-4" />
                <span>Notes & activity</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview - Only visible on mobile */}
            <TabsContent value="overview" className="lg:hidden">
              <CustomerInfoCard booking={booking} />
              <TeamLocationCard booking={booking} />
              <EventLogisticsCard
                booking={booking}
                capabilities={capabilities}
                onEdit={handleEditBooking}
              />
              <CommunicationsTimeline booking={booking} />
            </TabsContent>

            {/* Tab 2: Team & Shifts */}
            <TabsContent value="team">
              {providerId && (
                <StaffingShiftsCard
                  booking={booking}
                  capabilities={capabilities}
                  providerId={providerId}
                />
              )}
            </TabsContent>

            {/* Tab 3: Financials */}
            <TabsContent value="financials">
              <FinancialsCard
                booking={booking}
                capabilities={capabilities}
                onManageBilling={handleManageBilling}
              />
            </TabsContent>

            {/* Tab 4: Notes & Activity */}
            <TabsContent value="activity">
              <NotesActivityCard
                booking={booking}
                capabilities={capabilities}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Right side on desktop (1/3 width) | Hidden on mobile */}
        <div className="hidden lg:flex lg:flex-col lg:space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <CustomerInfoCard booking={booking} />
          <TeamLocationCard booking={booking} />
          <EventLogisticsCard
            booking={booking}
            capabilities={capabilities}
            onEdit={handleEditBooking}
          />
          <CommunicationsTimeline booking={booking} />
        </div>
      </div>

      {/* Phase 9: Workflow Actions Bar - Always visible at bottom */}
      <WorkflowActionsBar
        booking={booking}
        capabilities={capabilities}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onComplete={handleComplete}
        onEdit={handleEditBooking}
        onAssignTeam={handleAssignTeam}
        onManageBilling={handleManageBilling}
        onSendUpdate={handleSendUpdate}
        onReschedule={handleReschedule}
        onDelete={handleDelete}
      />
    </div>
  );
}

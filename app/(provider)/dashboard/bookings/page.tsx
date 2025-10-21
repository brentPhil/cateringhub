"use client";

import { useCurrentMembership } from "@/hooks/use-membership";
import { useBookings } from "./hooks/use-bookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookingsTable } from "./components/bookings-table";
import { Calendar, Search, Filter, UserCheck } from "lucide-react";
import {
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from "nuqs";

export default function BookingsPage() {
  // Get current user's membership
  const { data: membership, isLoading: membershipLoading } =
    useCurrentMembership();
  const providerId = membership?.providerId;

  // URL state management with nuqs
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    status: parseAsString.withDefault(""),
    assigned_to_me: parseAsBoolean.withDefault(false),
    page: parseAsInteger.withDefault(1),
    page_size: parseAsInteger.withDefault(10),
    sort_by: parseAsString.withDefault("event_date"),
    sort_order: parseAsString.withDefault("asc"),
  });

  // Fetch bookings with role-based filtering
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(
    providerId,
    filters
  );

  const isLoading = membershipLoading || bookingsLoading;
  const bookings = bookingsData?.data || [];
  const pagination = bookingsData?.pagination;
  const canEdit = bookingsData?.canEditBookings || false;

  // Handlers
  const handleSearch = (value: string) => {
    setFilters({ search: value, page: 1 });
  };

  const handleStatusFilter = (value: string) => {
    setFilters({ status: value === "all" ? "" : value, page: 1 });
  };

  const handleAssignedToMeToggle = () => {
    setFilters({ assigned_to_me: !filters.assigned_to_me, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setFilters({ page_size: newPageSize, page: 1 });
  };

  const handleSort = (field: string) => {
    const newOrder =
      filters.sort_by === field && filters.sort_order === "asc"
        ? "desc"
        : "asc";
    setFilters({ sort_by: field, sort_order: newOrder });
  };

  // Show message if user doesn't have a provider membership
  if (!membership && !membershipLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage your catering bookings and assignments
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            {membership?.capabilities.canViewAllBookings
              ? "Manage all catering bookings and assignments"
              : "View your assigned bookings"}
          </p>
        </div>
        {membership?.role && (
          <Badge variant="outline" className="capitalize">
            {membership.role}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email, or event type..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.status || "all"}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned to me filter */}
        <Button
          variant={filters.assigned_to_me ? "default" : "outline"}
          onClick={handleAssignedToMeToggle}
          className="w-full sm:w-auto"
        >
          <UserCheck className="mr-2 h-4 w-4" />
          Assigned to me
        </Button>
      </div>

      {/* Bookings table */}
      <BookingsTable
        bookings={bookings}
        isLoading={isLoading}
        canEdit={canEdit}
        currentUserId={membership?.userId}
        providerId={providerId}
        pagination={pagination}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Stats summary */}
      {pagination && !isLoading && (
        <div className="text-sm text-muted-foreground">
          Showing {bookings.length} of {pagination.totalItems} bookings
          {filters.assigned_to_me && " assigned to you"}
          {filters.status && ` with status "${filters.status}"`}
          {filters.search && ` matching "${filters.search}"`}
        </div>
      )}
    </div>
  );
}

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { BookingDetailClient } from "./components/booking-detail-client";

interface BookingDetailPageProps {
  params: Promise<{
    bookingId: string;
  }>;
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps) {
  const { bookingId } = await params;

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(bookingId)) {
    notFound();
  }

  return (
    <Suspense fallback={<LoadingState variant="card" count={3} />}>
      <BookingDetailClient bookingId={bookingId} />
    </Suspense>
  );
}


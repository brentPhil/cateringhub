"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import type {
  BookingDetailData,
  BookingDetailCapabilities,
} from "../../hooks/use-booking-detail";
import { calculateLaborCost, formatCurrency } from "../utils/booking-utils";

interface FinancialsCardProps {
  booking: BookingDetailData;
  capabilities: BookingDetailCapabilities;
  onManageBilling?: () => void;
}

export function FinancialsCard({
  booking,
  capabilities,
  onManageBilling,
}: FinancialsCardProps) {
  const canManageBilling =
    capabilities.canManageBilling && booking.status !== "cancelled";

  // Calculate costs
  const estimatedBudget = booking.estimated_budget
    ? Number(booking.estimated_budget)
    : null;
  const estimatedLaborCost = calculateLaborCost(
    booking.shiftAggregates.estimatedHours
  );
  const actualLaborCost = calculateLaborCost(
    booking.shiftAggregates.actualHours
  );

  const hasActualCosts = booking.shiftAggregates.actualHours > 0;
  const hasBudget = estimatedBudget !== null;

  // Calculate budget variance
  let budgetVariance = null;
  let budgetVariancePercent = null;
  if (hasBudget && hasActualCosts) {
    budgetVariance = estimatedBudget - actualLaborCost;
    budgetVariancePercent = ((budgetVariance / estimatedBudget) * 100).toFixed(
      1
    );
  }

  // Determine payment status (placeholder - would come from actual payment data)
  const paymentStatus: "pending" | "partial" | "paid" | "overdue" = "pending";

  const getPaymentStatusBadge = () => {
    switch (paymentStatus) {
      case "paid":
        return <Badge variant="default">Paid</Badge>;
      case "partial":
        return <Badge variant="secondary">Partial payment</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financials</CardTitle>
          {canManageBilling && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageBilling}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Manage billing
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment status */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            Payment status
          </div>
          {getPaymentStatusBadge()}
        </div>

        <Separator />

        {/* Budget overview */}
        {hasBudget && (
          <>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Estimated budget
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(estimatedBudget)}
                  </div>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Labor costs */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Labor costs</div>

          {/* Estimated labor cost */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Estimated ({booking.shiftAggregates.estimatedHours.toFixed(1)}{" "}
              hrs)
            </div>
            <div className="font-semibold">
              {formatCurrency(estimatedLaborCost)}
            </div>
          </div>

          {/* Actual labor cost */}
          {hasActualCosts && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Actual ({booking.shiftAggregates.actualHours.toFixed(1)} hrs)
              </div>
              <div className="font-semibold">
                {formatCurrency(actualLaborCost)}
              </div>
            </div>
          )}

          {/* Labor cost variance */}
          {hasActualCosts && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {actualLaborCost > estimatedLaborCost ? (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  )}
                  <div className="text-sm font-medium">Labor variance</div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`font-semibold ${
                      actualLaborCost > estimatedLaborCost
                        ? "text-destructive"
                        : "text-green-600"
                    }`}
                  >
                    {actualLaborCost > estimatedLaborCost ? "+" : ""}
                    {formatCurrency(actualLaborCost - estimatedLaborCost)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Budget variance */}
        {hasBudget && hasActualCosts && budgetVariance !== null && (
          <>
            <Separator />
            <div className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    budgetVariance >= 0 ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  {budgetVariance >= 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Budget variance
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div
                      className={`text-2xl font-bold ${
                        budgetVariance >= 0
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {budgetVariance >= 0 ? "" : "-"}
                      {formatCurrency(Math.abs(budgetVariance))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ({budgetVariancePercent}%)
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {budgetVariance >= 0 ? "Under budget" : "Over budget"}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Notes about financials */}
        {!hasBudget && (
          <>
            <Separator />
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                No estimated budget set for this booking. Labor costs are
                calculated at $150/hour.
              </div>
            </div>
          </>
        )}

        {/* Placeholder for documents section */}
        <Separator />
        <div className="space-y-2">
          <div className="text-sm font-medium">Documents</div>
          <div className="flex flex-col items-center justify-center py-6 text-center border rounded-lg bg-muted/20">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet
            </p>
            {canManageBilling && (
              <Button variant="link" size="sm" className="mt-2">
                Upload document
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

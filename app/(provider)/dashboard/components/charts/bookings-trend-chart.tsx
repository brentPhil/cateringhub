"use client";

import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface BookingPoint {
  month: string;
  bookings: number;
}

interface BookingsTrendChartProps {
  title?: string;
  subtitle?: string;
  data: BookingPoint[];
}

const config: ChartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--chart-1))",
  },
};

export function BookingsTrendChart({ title = "Booking trends", subtitle = "Last 6 months", data }: BookingsTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip content={<ChartTooltipContent indicator="line" />} />
              <ChartTooltip cursor={false} />
              <Area
                dataKey="bookings"
                type="monotone"
                stroke="var(--color-bookings)"
                fill="var(--color-bookings)"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}


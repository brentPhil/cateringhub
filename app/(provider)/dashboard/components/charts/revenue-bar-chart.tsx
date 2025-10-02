"use client";

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface RevenuePoint {
  month: string;
  revenue: number;
}

interface RevenueBarChartProps {
  title?: string;
  subtitle?: string;
  data: RevenuePoint[];
}

const config: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
};

export function RevenueBarChart({ title = "Revenue", subtitle = "Last 6 months", data }: RevenueBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <Tooltip content={<ChartTooltipContent />} />
              <ChartTooltip cursor={false} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}


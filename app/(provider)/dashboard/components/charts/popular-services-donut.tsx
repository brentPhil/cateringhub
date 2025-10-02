"use client";

import { Pie, PieChart, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface ServiceSlice {
  name: string;
  value: number;
}

interface PopularServicesDonutProps {
  title?: string;
  subtitle?: string;
  data: ServiceSlice[];
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const config: ChartConfig = {
  value: { label: "Share" },
};

export function PopularServicesDonut({ title = "Popular services", subtitle = "Share of bookings", data }: PopularServicesDonutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="mx-auto h-64 w-full max-w-[18rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} strokeWidth={4}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent nameKey="name" />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.map((s) => (
            <div key={s.name} className="flex items-center justify-between">
              <span className="text-muted-foreground">{s.name}</span>
              <span className="font-medium">{s.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


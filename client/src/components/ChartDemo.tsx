"use client";

import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const pieData = [
  { name: "Desktop", value: 400, color: "#19C37D" },
  { name: "Mobile", value: 300, color: "#3B82F6" },
  { name: "Tablet", value: 200, color: "#8B5CF6" },
  { name: "Other", value: 100, color: "#F59E0B" },
];

export default function ChartDemo() {
  return (
    <div className='p-8 space-y-8'>
      <div>
        <h1 className='text-3xl font-bold text-white mb-2'>Chart Showcase</h1>
        <p className='text-gray-400'>
          Examples of different chart types using shadcn/ui charts with Recharts
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Bar Chart */}
        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Bar Chart</CardTitle>
            <CardDescription className='text-gray-400'>
              Monthly data showing desktop vs mobile usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey='month'
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator='dashed' />}
                />
                <Bar dataKey='desktop' fill='var(--color-desktop)' radius={4} />
                <Bar dataKey='mobile' fill='var(--color-mobile)' radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Line Chart</CardTitle>
            <CardDescription className='text-gray-400'>
              Trending data over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey='month'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Line
                  dataKey='desktop'
                  type='monotone'
                  stroke='var(--color-desktop)'
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey='mobile'
                  type='monotone'
                  stroke='var(--color-mobile)'
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Area Chart */}
        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Area Chart</CardTitle>
            <CardDescription className='text-gray-400'>
              Stacked area showing cumulative data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <AreaChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey='month'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <defs>
                  <linearGradient id='fillDesktop' x1='0' y1='0' x2='0' y2='1'>
                    <stop
                      offset='5%'
                      stopColor='var(--color-desktop)'
                      stopOpacity={0.8}
                    />
                    <stop
                      offset='95%'
                      stopColor='var(--color-desktop)'
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id='fillMobile' x1='0' y1='0' x2='0' y2='1'>
                    <stop
                      offset='5%'
                      stopColor='var(--color-mobile)'
                      stopOpacity={0.8}
                    />
                    <stop
                      offset='95%'
                      stopColor='var(--color-mobile)'
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey='mobile'
                  type='natural'
                  fill='url(#fillMobile)'
                  fillOpacity={0.4}
                  stroke='var(--color-mobile)'
                  stackId='a'
                />
                <Area
                  dataKey='desktop'
                  type='natural'
                  fill='url(#fillDesktop)'
                  fillOpacity={0.4}
                  stroke='var(--color-desktop)'
                  stackId='a'
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Pie Chart</CardTitle>
            <CardDescription className='text-gray-400'>
              Distribution of device types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-8'>
              <ChartContainer
                config={chartConfig}
                className='h-[250px] w-[250px]'
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    cx='50%'
                    cy='50%'
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='value'
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
              </ChartContainer>

              <div className='space-y-2'>
                {pieData.map((item, index) => (
                  <div key={item.name} className='flex items-center space-x-2'>
                    <div
                      className='w-3 h-3 rounded'
                      style={{ backgroundColor: item.color }}
                    />
                    <span className='text-gray-300 text-sm'>
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Examples */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Usage</CardTitle>
          <CardDescription className='text-gray-400'>
            How to use these charts in your components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4 text-sm'>
            <div>
              <h4 className='text-white font-medium mb-2'>
                1. Import the components:
              </h4>
              <code className='block p-2 bg-gray-800 text-gray-300 rounded'>
                {`import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";`}
              </code>
            </div>
            <div>
              <h4 className='text-white font-medium mb-2'>
                2. Define your chart config:
              </h4>
              <code className='block p-2 bg-gray-800 text-gray-300 rounded'>
                {`const chartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;`}
              </code>
            </div>
            <div>
              <h4 className='text-white font-medium mb-2'>
                3. Use in your JSX:
              </h4>
              <code className='block p-2 bg-gray-800 text-gray-300 rounded'>
                {`<ChartContainer config={chartConfig}>
  <BarChart data={data}>
    <XAxis dataKey="month" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="desktop" fill="var(--color-desktop)" />
  </BarChart>
</ChartContainer>`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

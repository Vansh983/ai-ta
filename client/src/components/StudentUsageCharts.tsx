"use client";

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  Area,
  AreaChart,
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

interface StudentUsageChartsProps {
  courseCode: string;
}

export default function StudentUsageCharts({
  courseCode,
}: StudentUsageChartsProps) {
  // Topic distribution data
  const topicData = [
    {
      topic: "Data Structures",
      queries: 342,
      sessions: 89,
      avgTime: 12.4,
      color: "#19C37D",
    },
    {
      topic: "Algorithms",
      queries: 298,
      sessions: 76,
      avgTime: 15.2,
      color: "#3B82F6",
    },
    {
      topic: "Programming",
      queries: 256,
      sessions: 124,
      avgTime: 8.7,
      color: "#8B5CF6",
    },
    {
      topic: "Debugging",
      queries: 189,
      sessions: 67,
      avgTime: 6.3,
      color: "#F59E0B",
    },
    {
      topic: "OOP Concepts",
      queries: 167,
      sessions: 45,
      avgTime: 11.1,
      color: "#EF4444",
    },
    {
      topic: "System Design",
      queries: 134,
      sessions: 38,
      avgTime: 18.5,
      color: "#06B6D4",
    },
    {
      topic: "Testing",
      queries: 98,
      sessions: 29,
      avgTime: 7.2,
      color: "#84CC16",
    },
  ];

  // Daily usage data for the last 7 days
  const dailyUsageData = [
    { day: "Mon", queries: 145, activeUsers: 23, peakHour: 14 },
    { day: "Tue", queries: 178, activeUsers: 31, peakHour: 15 },
    { day: "Wed", queries: 201, activeUsers: 28, peakHour: 13 },
    { day: "Thu", queries: 187, activeUsers: 35, peakHour: 16 },
    { day: "Fri", queries: 223, activeUsers: 42, peakHour: 14 },
    { day: "Sat", queries: 89, activeUsers: 15, peakHour: 11 },
    { day: "Sun", queries: 67, activeUsers: 12, peakHour: 19 },
  ];

  // Hourly activity distribution
  const hourlyData = [
    { hour: "6 AM", activity: 12 },
    { hour: "8 AM", activity: 45 },
    { hour: "10 AM", activity: 78 },
    { hour: "12 PM", activity: 134 },
    { hour: "2 PM", activity: 189 },
    { hour: "4 PM", activity: 167 },
    { hour: "6 PM", activity: 156 },
    { hour: "8 PM", activity: 98 },
    { hour: "10 PM", activity: 67 },
  ];

  // Session duration distribution
  const sessionData = [
    { duration: "< 5 min", count: 156, percentage: 23 },
    { duration: "5-15 min", count: 234, percentage: 35 },
    { duration: "15-30 min", count: 189, percentage: 28 },
    { duration: "30+ min", count: 94, percentage: 14 },
  ];

  const chartConfig = {
    queries: {
      label: "Queries",
      color: "hsl(var(--chart-1))",
    },
    activeUsers: {
      label: "Active Users",
      color: "hsl(var(--chart-2))",
    },
    activity: {
      label: "Activity",
      color: "hsl(var(--chart-3))",
    },
    sessions: {
      label: "Sessions",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  return (
    <div className='space-y-6'>
      {/* Topic Distribution */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Usage by Topic</CardTitle>
            <CardDescription className='text-gray-400'>
              Student query distribution across different topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={topicData}>
                <XAxis
                  dataKey='topic'
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  angle={-45}
                  textAnchor='end'
                  height={80}
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
                <Bar dataKey='queries' fill='#19C37D' radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Topic Popularity</CardTitle>
            <CardDescription className='text-gray-400'>
              Distribution of student interest across topics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-8'>
              <ChartContainer
                config={chartConfig}
                className='h-[200px] w-[200px]'
              >
                <PieChart>
                  <Pie
                    data={topicData}
                    cx='50%'
                    cy='50%'
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='queries'
                  >
                    {topicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              <div className='space-y-2'>
                {topicData.slice(0, 5).map((item) => (
                  <div key={item.topic} className='flex items-center space-x-2'>
                    <div
                      className='w-3 h-3 rounded'
                      style={{ backgroundColor: item.color }}
                    />
                    <span className='text-gray-300 text-sm'>
                      {item.topic}: {item.queries}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity and Hourly Patterns */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Daily Activity</CardTitle>
            <CardDescription className='text-gray-400'>
              Student queries and active users over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart accessibilityLayer data={dailyUsageData}>
                <XAxis
                  dataKey='day'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
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
                  dataKey='queries'
                  type='monotone'
                  stroke='var(--color-queries)'
                  strokeWidth={2}
                  dot={{ fill: "var(--color-queries)", strokeWidth: 2, r: 4 }}
                />
                <Line
                  dataKey='activeUsers'
                  type='monotone'
                  stroke='var(--color-activeUsers)'
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-activeUsers)",
                    strokeWidth: 2,
                    r: 4,
                  }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className='border-gray-700 bg-[#343541]'>
          <CardHeader>
            <CardTitle className='text-white'>Peak Usage Hours</CardTitle>
            <CardDescription className='text-gray-400'>
              Student activity throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <AreaChart accessibilityLayer data={hourlyData}>
                <XAxis
                  dataKey='hour'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
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
                  <linearGradient id='fillActivity' x1='0' y1='0' x2='0' y2='1'>
                    <stop
                      offset='5%'
                      stopColor='var(--color-activity)'
                      stopOpacity={0.8}
                    />
                    <stop
                      offset='95%'
                      stopColor='var(--color-activity)'
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey='activity'
                  type='natural'
                  fill='url(#fillActivity)'
                  fillOpacity={0.4}
                  stroke='var(--color-activity)'
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Topic Metrics */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>
            Topic Performance Metrics
          </CardTitle>
          <CardDescription className='text-gray-400'>
            Detailed breakdown of student engagement by topic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {topicData.map((topic, index) => (
              <div key={topic.topic} className='p-4 rounded-lg bg-gray-800/50'>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center space-x-3'>
                    <div
                      className='w-4 h-4 rounded'
                      style={{ backgroundColor: topic.color }}
                    />
                    <h4 className='text-white font-medium'>{topic.topic}</h4>
                  </div>
                  <div className='text-gray-400 text-sm'>
                    #{index + 1} most popular
                  </div>
                </div>

                <div className='grid grid-cols-3 gap-4'>
                  <div className='text-center'>
                    <p className='text-2xl font-bold text-white'>
                      {topic.queries}
                    </p>
                    <p className='text-gray-400 text-xs'>Total Queries</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-2xl font-bold text-blue-400'>
                      {topic.sessions}
                    </p>
                    <p className='text-gray-400 text-xs'>Active Sessions</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-2xl font-bold text-purple-400'>
                      {topic.avgTime}m
                    </p>
                    <p className='text-gray-400 text-xs'>Avg. Session Time</p>
                  </div>
                </div>

                <div className='mt-3'>
                  <div className='flex justify-between text-sm mb-1'>
                    <span className='text-gray-400'>Engagement Level</span>
                    <span className='text-gray-300'>
                      {Math.round(
                        (topic.queries /
                          Math.max(...topicData.map((t) => t.queries))) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className='w-full bg-gray-700 rounded-full h-2'>
                    <div
                      className='h-2 rounded-full'
                      style={{
                        backgroundColor: topic.color,
                        width: `${Math.round(
                          (topic.queries /
                            Math.max(...topicData.map((t) => t.queries))) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Duration Analysis */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>
            Session Duration Analysis
          </CardTitle>
          <CardDescription className='text-gray-400'>
            How long students typically spend in learning sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={sessionData}>
                <XAxis
                  dataKey='duration'
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
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
                <Bar dataKey='count' fill='#8B5CF6' radius={4} />
              </BarChart>
            </ChartContainer>

            <div className='space-y-4'>
              {sessionData.map((session, index) => (
                <div
                  key={session.duration}
                  className='flex items-center justify-between p-3 bg-gray-800/50 rounded-lg'
                >
                  <div className='flex items-center space-x-3'>
                    <div className='flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold'>
                      {session.percentage}%
                    </div>
                    <div>
                      <p className='text-white font-medium'>
                        {session.duration}
                      </p>
                      <p className='text-gray-400 text-sm'>
                        {session.count} sessions
                      </p>
                    </div>
                  </div>
                  <div className='w-20 bg-gray-700 rounded-full h-2'>
                    <div
                      className='bg-purple-400 h-2 rounded-full'
                      style={{ width: `${session.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

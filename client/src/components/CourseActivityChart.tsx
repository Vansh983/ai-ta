"use client";

import { Line, LineChart, XAxis, YAxis } from "recharts";
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

interface Course {
  id: string;
  name: string;
  code: string;
  faculty: string;
  term: "Fall" | "Winter" | "Summer";
  year: number;
  description: string;
  documents: string[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface CourseActivityChartProps {
  courses: Course[];
}

export default function CourseActivityChart({
  courses,
}: CourseActivityChartProps) {
  // Generate activity data for the last 6 months
  const generateActivityData = () => {
    const months = [];
    const currentDate = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      const year = date.getFullYear();

      // Count courses created in this month
      const coursesCreated = courses.filter((course) => {
        const courseDate = new Date(course.createdAt);
        return (
          courseDate.getMonth() === date.getMonth() &&
          courseDate.getFullYear() === date.getFullYear()
        );
      }).length;

      // Estimate document uploads (this would come from actual upload timestamps in a real app)
      const documentsUploaded = courses.reduce((total, course) => {
        // Simulate some document activity based on course creation time
        const courseDate = new Date(course.createdAt);
        if (
          courseDate.getMonth() === date.getMonth() &&
          courseDate.getFullYear() === date.getFullYear()
        ) {
          return total + course.documents.length;
        }
        return total;
      }, 0);

      months.push({
        month: `${monthName} ${year}`,
        courses: coursesCreated,
        documents: documentsUploaded,
        activity: coursesCreated + Math.floor(documentsUploaded / 2), // Combined activity score
      });
    }

    return months;
  };

  const activityData = generateActivityData();

  const chartConfig = {
    courses: {
      label: "Courses Created",
      color: "hsl(var(--chart-1))",
    },
    documents: {
      label: "Documents Uploaded",
      color: "hsl(var(--chart-2))",
    },
    activity: {
      label: "Total Activity",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  const totalActivity = activityData.reduce(
    (sum, data) => sum + data.activity,
    0
  );
  const avgActivity = Math.round(totalActivity / activityData.length);
  const currentMonthActivity =
    activityData[activityData.length - 1]?.activity || 0;
  const previousMonthActivity =
    activityData[activityData.length - 2]?.activity || 0;
  const activityTrend = currentMonthActivity - previousMonthActivity;

  if (courses.length === 0) {
    return (
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Activity Trends</CardTitle>
          <CardDescription className='text-gray-400'>
            No activity data available. Create courses and upload documents to
            see trends.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Activity Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card className='border-gray-700 bg-[#343541]'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-sm'>This Month</p>
                <p className='text-2xl font-bold text-white'>
                  {currentMonthActivity}
                </p>
              </div>
              <div
                className={`text-sm ${
                  activityTrend >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {activityTrend >= 0 ? "+" : ""}
                {activityTrend}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-gray-700 bg-[#343541]'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-sm'>Avg. Monthly</p>
                <p className='text-2xl font-bold text-white'>{avgActivity}</p>
              </div>
              <div className='text-blue-400'>
                <svg
                  className='w-5 h-5'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='border-gray-700 bg-[#343541]'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-sm'>Total Activity</p>
                <p className='text-2xl font-bold text-white'>{totalActivity}</p>
              </div>
              <div className='text-purple-400'>
                <svg
                  className='w-5 h-5'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trends Chart */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Activity Trends</CardTitle>
          <CardDescription className='text-gray-400'>
            Course creation and document upload activity over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <LineChart accessibilityLayer data={activityData}>
              <XAxis
                dataKey='month'
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                tickFormatter={(value) => value.split(" ")[0]} // Show only month abbreviation
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                dataKey='courses'
                type='monotone'
                stroke='var(--color-courses)'
                strokeWidth={2}
                dot={{ fill: "var(--color-courses)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                dataKey='documents'
                type='monotone'
                stroke='var(--color-documents)'
                strokeWidth={2}
                dot={{ fill: "var(--color-documents)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                dataKey='activity'
                type='monotone'
                stroke='var(--color-activity)'
                strokeWidth={3}
                dot={{ fill: "var(--color-activity)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                strokeDasharray='5 5'
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Activity Breakdown */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Monthly Breakdown</CardTitle>
          <CardDescription className='text-gray-400'>
            Detailed view of monthly activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {activityData.reverse().map((month, index) => (
              <div
                key={month.month}
                className='flex items-center justify-between p-3 bg-gray-800/50 rounded-lg'
              >
                <div className='flex items-center space-x-3'>
                  <div className='w-2 h-8 bg-gradient-to-t from-[#19C37D] to-[#3B82F6] rounded'></div>
                  <div>
                    <p className='text-white font-medium'>{month.month}</p>
                    <p className='text-gray-400 text-sm'>
                      {month.courses} courses, {month.documents} documents
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-white font-bold'>{month.activity}</p>
                  <p className='text-gray-400 text-sm'>activity score</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

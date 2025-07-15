"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
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

interface CourseAnalyticsChartProps {
  courses: Course[];
}

export default function CourseAnalyticsChart({
  courses,
}: CourseAnalyticsChartProps) {
  // Prepare data for courses by term chart
  const coursesByTerm = courses.reduce((acc, course) => {
    const termKey = `${course.term} ${course.year}`;
    acc[termKey] = (acc[termKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const termChartData = Object.entries(coursesByTerm).map(([term, count]) => ({
    term,
    courses: count,
  }));

  // Prepare data for documents per course chart
  const documentsData = courses.map((course) => ({
    course: course.code,
    documents: course.documents.length,
  }));

  // Prepare data for faculty distribution
  const facultyDistribution = courses.reduce((acc, course) => {
    acc[course.faculty] = (acc[course.faculty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const facultyData = Object.entries(facultyDistribution).map(
    ([faculty, count]) => ({
      faculty,
      courses: count,
    })
  );

  const chartConfig = {
    courses: {
      label: "Courses",
      color: "hsl(var(--chart-1))",
    },
    documents: {
      label: "Documents",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  const pieColors = ["#19C37D", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];

  if (courses.length === 0) {
    return (
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Course Analytics</CardTitle>
          <CardDescription className='text-gray-400'>
            No data available. Create some courses to see analytics.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      {/* Courses by Term */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Courses by Term</CardTitle>
          <CardDescription className='text-gray-400'>
            Distribution of your courses across different terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={termChartData}>
              <XAxis
                dataKey='term'
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
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey='courses' fill='#19C37D' radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Documents per Course */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Documents per Course</CardTitle>
          <CardDescription className='text-gray-400'>
            Number of documents uploaded for each course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={documentsData}>
              <XAxis
                dataKey='course'
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
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar dataKey='documents' fill='#3B82F6' radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Faculty Distribution */}
      {facultyData.length > 1 && (
        <Card className='border-gray-700 bg-[#343541] lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-white'>Courses by Faculty</CardTitle>
            <CardDescription className='text-gray-400'>
              Distribution of your courses across different faculties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-8'>
              <ChartContainer
                config={chartConfig}
                className='h-[300px] w-[300px]'
              >
                <PieChart>
                  <Pie
                    data={facultyData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='courses'
                  >
                    {facultyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>

              <div className='space-y-2'>
                {facultyData.map((item, index) => (
                  <div
                    key={item.faculty}
                    className='flex items-center space-x-2'
                  >
                    <div
                      className='w-3 h-3 rounded'
                      style={{
                        backgroundColor: pieColors[index % pieColors.length],
                      }}
                    />
                    <span className='text-gray-300 text-sm'>
                      {item.faculty}: {item.courses} course
                      {item.courses !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card className='border-gray-700 bg-[#343541] lg:col-span-2'>
        <CardHeader>
          <CardTitle className='text-white'>Quick Stats</CardTitle>
          <CardDescription className='text-gray-400'>
            Overview of your course portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-[#19C37D]'>
                {courses.length}
              </div>
              <div className='text-sm text-gray-400'>Total Courses</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-400'>
                {courses.reduce(
                  (sum, course) => sum + course.documents.length,
                  0
                )}
              </div>
              <div className='text-sm text-gray-400'>Total Documents</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-400'>
                {Math.round(
                  courses.reduce(
                    (sum, course) => sum + course.documents.length,
                    0
                  ) / courses.length || 0
                )}
              </div>
              <div className='text-sm text-gray-400'>Avg. Docs/Course</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-yellow-400'>
                {new Set(courses.map((c) => c.faculty)).size}
              </div>
              <div className='text-sm text-gray-400'>Faculties</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

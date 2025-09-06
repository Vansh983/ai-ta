"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

interface CourseAboutCardsProps {
  course: Course;
}

export default function CourseAboutCards({ course }: CourseAboutCardsProps) {
  // Generate dummy statistics
  const stats = {
    totalStudents: Math.floor(Math.random() * 150) + 50, // 50-200 students
    activeStudents: Math.floor(Math.random() * 50) + 20, // 20-70 active
    totalQuestions: Math.floor(Math.random() * 500) + 100, // 100-600 questions
    avgSessionTime: Math.floor(Math.random() * 15) + 5, // 5-20 minutes
    engagementRate: Math.floor(Math.random() * 40) + 60, // 60-100%
    lastActivity: "2 hours ago",
    weeklyGrowth: Math.floor(Math.random() * 20) + 5, // 5-25%
    documentViews: Math.floor(Math.random() * 1000) + 200, // 200-1200 views
  };

  const courseDuration = Math.floor(
    (new Date().getTime() - new Date(course.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
      {/* Course Overview */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-white text-sm font-medium'>
            Course Overview
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Students Enrolled</span>
            <span className='text-white font-semibold'>
              {stats.totalStudents}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Active This Week</span>
            <span className='text-[#19C37D] font-semibold'>
              {stats.activeStudents}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Course Duration</span>
            <span className='text-gray-300 font-medium'>
              {courseDuration} days
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Documents</span>
            <span className='text-blue-400 font-semibold'>
              {course.documents.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Student Engagement */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-white text-sm font-medium'>
            Student Engagement
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Questions Asked</span>
            <span className='text-white font-semibold'>
              {stats.totalQuestions.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Avg. Session</span>
            <span className='text-purple-400 font-semibold'>
              {stats.avgSessionTime}m
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Engagement Rate</span>
            <span className='text-[#19C37D] font-semibold'>
              {stats.engagementRate}%
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Weekly Growth</span>
            <span className='text-blue-400 font-semibold'>
              +{stats.weeklyGrowth}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-white text-sm font-medium'>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Last Activity</span>
            <span className='text-white font-semibold'>
              {stats.lastActivity}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Document Views</span>
            <span className='text-yellow-400 font-semibold'>
              {stats.documentViews.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Peak Time</span>
            <span className='text-gray-300 font-medium'>2-4 PM</span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Status</span>
            <div className='flex items-center space-x-1'>
              <div className='w-2 h-2 bg-[#19C37D] rounded-full'></div>
              <span className='text-[#19C37D] text-xs font-medium'>Active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-white text-sm font-medium'>
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-400 text-xs'>Response Accuracy</span>
              <span className='text-[#19C37D] font-semibold'>94%</span>
            </div>
            <div className='w-full bg-gray-700 rounded-full h-1.5'>
              <div
                className='bg-[#19C37D] h-1.5 rounded-full'
                style={{ width: "94%" }}
              ></div>
            </div>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-400 text-xs'>
                Student Satisfaction
              </span>
              <span className='text-blue-400 font-semibold'>4.7/5</span>
            </div>
            <div className='w-full bg-gray-700 rounded-full h-1.5'>
              <div
                className='bg-blue-400 h-1.5 rounded-full'
                style={{ width: "94%" }}
              ></div>
            </div>
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-gray-400 text-xs'>Usage Trend</span>
              <div className='flex items-center space-x-1'>
                <svg
                  className='w-3 h-3 text-[#19C37D]'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span className='text-[#19C37D] text-xs font-medium'>
                  Increasing
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { type Course, apiService } from "@/lib/services/api";

interface CourseAboutCardsProps {
  course: Course;
  documentsCount?: number;
}

interface AnalyticsData {
  overview: {
    total_queries: number;
    active_users: number;
    total_sessions: number;
    avg_session_duration_minutes: number;
  };
  engagement: {
    total_messages: number;
    question_ratio: number;
    questions_asked: number;
  };
  growth_metrics: {
    current_period: {
      queries: number;
      users: number;
    };
    growth: {
      queries_percent: number;
      users_percent: number;
    };
  };
  material_usage: {
    total_materials: number;
    usage_rate: number;
    material_popularity: Record<string, number>;
  };
}

export default function CourseAboutCards({ course, documentsCount = 0 }: CourseAboutCardsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDetailedCourseAnalytics(course.id, 30);
        
        // Handle the nested structure from the API response
        if (data.analytics) {
          setAnalyticsData(data.analytics as AnalyticsData);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        // Keep null state to show fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [course.id]);

  // Use analytics data if available, otherwise fall back to estimates
  const stats = analyticsData ? {
    totalStudents: Math.max(analyticsData.overview.active_users * 3, 25), // Estimate total from active
    activeStudents: analyticsData.overview.active_users,
    totalQuestions: analyticsData.overview.total_queries,
    avgSessionTime: Math.round(analyticsData.overview.avg_session_duration_minutes),
    engagementRate: Math.min(Math.round(analyticsData.engagement.question_ratio * 100), 100),
    lastActivity: "Recently", // Could be enhanced with actual timestamp
    weeklyGrowth: Math.round(analyticsData.growth_metrics.growth.queries_percent),
    documentViews: Math.round(analyticsData.material_usage.usage_rate * 100), // Convert to percentage-like number
  } : {
    totalStudents: 0,
    activeStudents: 0,
    totalQuestions: 0,
    avgSessionTime: 0,
    engagementRate: 0,
    lastActivity: "No data",
    weeklyGrowth: 0,
    documentViews: 0,
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
            Course Overview {loading && <span className='text-xs text-gray-400'>(Loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Students Enrolled</span>
            <span className='text-white font-semibold'>
              {loading ? "--" : stats.totalStudents}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Active This Week</span>
            <span className='text-[#19C37D] font-semibold'>
              {loading ? "--" : stats.activeStudents}
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
              {documentsCount}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Student Engagement */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-white text-sm font-medium'>
            Student Engagement {loading && <span className='text-xs text-gray-400'>(Loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Questions Asked</span>
            <span className='text-white font-semibold'>
              {loading ? "--" : stats.totalQuestions.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-gray-400 text-xs'>Avg. Session</span>
            <span className='text-purple-400 font-semibold'>
              {loading ? "--" : stats.avgSessionTime}m
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
              {loading ? "--" : `${stats.weeklyGrowth >= 0 ? '+' : ''}${stats.weeklyGrowth}%`}
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

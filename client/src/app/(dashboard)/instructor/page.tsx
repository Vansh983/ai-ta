"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiService, type Course } from "@/lib/services/api";
import { useAuth } from "@/contexts/AuthContext";
import RequireAuth from "@/components/auth/RequireAuth";
// import CourseAnalyticsChart from "@/components/CourseAnalyticsChart";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  // Fetch courses when component mounts
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const fetchedCourses = await apiService.getCourses();
        console.log("Raw courses data in instructor page:", fetchedCourses, "Type:", typeof fetchedCourses);
        
        // Ensure fetchedCourses is an array
        const coursesArray = Array.isArray(fetchedCourses) ? fetchedCourses : [];
        setCourses(coursesArray);
        setError("");
      } catch (err) {
        setError("Failed to load courses. Please try again.");
        console.error("Error fetching courses:", err);
        setCourses([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const handleCreateCourse = () => {
    router.push("/instructor/create");
  };

  const handleViewCourse = (courseId: string) => {
    router.push(`/instructor/${courseId}`);
  };

  const handleEditCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/instructor/${courseId}/edit`);
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${course.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setDeletingCourseId(courseId);
      await apiService.deleteCourse(courseId);
      setCourses(courses.filter((course) => course.id !== courseId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course");
      console.error("Error deleting course:", err);
    } finally {
      setDeletingCourseId(null);
    }
  };

  if (!user) {
    return (
      <div className='container py-8'>
        <p className='text-center text-muted-foreground'>
          Please sign in to access the instructor dashboard.
        </p>
      </div>
    );
  }

  return (
    <RequireAuth allowedRoles={["instructor", "admin"]}>
      <div className='container p-8'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold text-white'>
              Instructor Dashboard
            </h1>
            <p className='text-gray-400 mt-1'>
              Manage your courses and educational content
            </p>
          </div>
          <Button
            onClick={handleCreateCourse}
            className='bg-[#19C37D] hover:bg-[#15A36B] text-white'
          >
            + Create New Course
          </Button>
        </div>

        {error && (
          <div className='mb-8 p-4 bg-red-900/50 text-red-200 rounded-md border border-red-800'>
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className='p-6 rounded-lg border border-gray-700 bg-[#343541]'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-sm'>Total Courses</p>
                <p className='text-2xl font-bold text-white'>
                  {courses.length}
                </p>
              </div>
              <div className='p-3 bg-[#19C37D]/20 rounded-lg'>
                <svg
                  className='w-6 h-6 text-[#19C37D]'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className='p-6 rounded-lg border border-gray-700 bg-[#343541]'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-sm'>Active Term</p>
                <p className='text-2xl font-bold text-white'>
                  {new Date().getMonth() < 5
                    ? "Winter"
                    : new Date().getMonth() < 8
                    ? "Summer"
                    : "Fall"}{" "}
                  {new Date().getFullYear()}
                </p>
              </div>
              <div className='p-3 bg-blue-500/20 rounded-lg'>
                <svg
                  className='w-6 h-6 text-blue-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className='p-6 rounded-lg border border-gray-700 bg-[#343541]'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-400 text-sm'>Total Documents</p>
                <p className='text-2xl font-bold text-white'>
                  {courses.length * 3}
                </p>
              </div>
              <div className='p-3 bg-purple-500/20 rounded-lg'>
                <svg
                  className='w-6 h-6 text-purple-500'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        {courses.length > 0 && (
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-white'>
                Course Analytics
              </h2>
            </div>
{/* <CourseAnalyticsChart courses={courses} /> */}
          </div>
        )}

        {/* Courses Section */}
        <div className='space-y-6'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold text-white'>Your Courses</h2>
            {courses.length > 0 && (
              <div className='text-gray-400 text-sm'>
                {courses.length} course{courses.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-white'>Loading courses...</div>
            </div>
          ) : courses.length === 0 ? (
            <div className='text-center py-12'>
              <div className='max-w-md mx-auto'>
                <div className='p-6 bg-[#343541] rounded-lg border border-gray-700'>
                  <svg
                    className='w-16 h-16 text-gray-500 mx-auto mb-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='1'
                      d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                    />
                  </svg>
                  <h3 className='text-lg font-medium text-white mb-2'>
                    No courses yet
                  </h3>
                  <p className='text-gray-400 mb-4'>
                    Get started by creating your first course. Add course
                    materials, manage documents, and engage with students.
                  </p>
                  <Button
                    onClick={handleCreateCourse}
                    className='bg-[#19C37D] hover:bg-[#15A36B] text-white'
                  >
                    Create Your First Course
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {courses.map((course) => (
                <div
                  key={course.id}
                  className='p-6 rounded-lg border border-gray-700 bg-[#343541] hover:border-gray-600 transition-colors cursor-pointer group'
                  onClick={() => handleViewCourse(course.id)}
                >
                  <div className='flex items-start justify-between mb-4'>
                    <div className='flex-1'>
                      <h3 className='font-semibold text-white text-lg mb-1 group-hover:text-[#19C37D] transition-colors'>
                        {course.name}
                      </h3>
                      <p className='text-[#19C37D] font-medium text-sm'>
                        {course.code}
                      </p>
                    </div>
                    <div className='flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <button
                        onClick={(e) => handleEditCourse(course.id, e)}
                        className='p-2 text-gray-400 hover:text-blue-400 transition-colors'
                        title='Edit course'
                      >
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth='2'
                            d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteCourse(course.id, e)}
                        disabled={deletingCourseId === course.id}
                        className='p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50'
                        title='Delete course'
                      >
                        {deletingCourseId === course.id ? (
                          <div className='w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin'></div>
                        ) : (
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth='2'
                              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className='space-y-2 text-sm text-gray-400 mb-4'>
                    <div className='flex items-center justify-between'>
                      <span>Term:</span>
                      <span className='text-gray-300'>
                        {course.term} {course.year}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>Faculty:</span>
                      <span className='text-gray-300'>{course.faculty}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span>Documents:</span>
                      <span className='text-gray-300'>
                        {Math.floor(Math.random() * 10)}
                      </span>
                    </div>
                  </div>

                  <p className='text-gray-300 text-sm line-clamp-2 mb-4'>
                    {course.description}
                  </p>

                  <div className='flex items-center justify-between text-xs text-gray-500'>
                    <span>
                      Created {new Date(course.createdAt).toLocaleDateString()}
                    </span>
                    <span className='text-[#19C37D]'>Click to view →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

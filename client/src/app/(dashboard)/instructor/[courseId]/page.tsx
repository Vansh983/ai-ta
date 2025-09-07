"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DocumentList from "@/components/DocumentList";
import CourseAboutCards from "@/components/CourseAboutCards";
import TopKeywords from "@/components/TopKeywords";
import StudentUsageCharts from "@/components/StudentUsageCharts";
import { apiService, type Course, type Material } from "@/lib/services/api";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import RequireAuth from "@/components/auth/RequireAuth";


export default function CourseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Fetch course and documents when component mounts
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !courseId) return;

      try {
        setLoading(true);

        // Fetch course details and documents in parallel
        const [courseData, courseDocuments] = await Promise.all([
          apiService.getCourse(courseId),
          apiService.getCourseMaterials(courseId),
        ]);

        // Check if user owns this course
        const hasEmailPermission = courseData.instructor?.email === user.email;
        const hasUserIdPermission = courseData.userId === user.uid;
        
        if (!hasEmailPermission && !hasUserIdPermission) {
          setError("You don't have permission to access this course.");
          return;
        }

        setCourse(courseData);
        setDocuments(courseDocuments);
        setError("");
      } catch (err) {
        setError("Failed to load course data. Please try again.");
        console.error("Error fetching course data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [user, courseId]);


  const handleEditCourse = () => {
    router.push(`/instructor/${courseId}/edit`);
  };

  const handleDeleteCourse = async () => {
    if (!user || !course) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${course.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await apiService.deleteCourse(courseId);
      toast.success(`Course "${course.name}" deleted successfully!`);
      router.push("/instructor");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete course";
      setError(errorMessage);
      toast.error("Failed to delete course", {
        description: errorMessage
      });
      console.error("Error deleting course:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/instructor");
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

  if (loading) {
    return (
      <div className='container py-8'>
        <div className='flex items-center justify-center'>
          <div className='text-white'>Loading course...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='container py-8'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <div className='p-4 bg-red-900/50 text-red-200 rounded-md border border-red-800'>
            {error}
          </div>
          <Button
            onClick={handleBackToDashboard}
            variant='outline'
            className='border-gray-700 text-gray-300 hover:bg-gray-700'
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className='container py-8'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <div className='text-gray-300'>Course not found.</div>
          <Button
            onClick={handleBackToDashboard}
            variant='outline'
            className='border-gray-700 text-gray-300 hover:bg-gray-700'
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <RequireAuth allowedRoles={["instructor", "admin"]}>
      <div className='container p-8'>
        {/* Header */}
        <div className='flex items-start justify-between mb-8'>
          <div className='space-y-2'>
            <div className='flex items-center space-x-4'>
              <Button
                variant='outline'
                onClick={handleBackToDashboard}
                className='border-gray-700 text-gray-300 hover:bg-gray-700'
              >
                ← Back
              </Button>
              <h1 className='text-3xl font-bold text-white'>{course.name}</h1>
            </div>
            <div className='flex items-center space-x-4 text-gray-300'>
              <span className='font-medium'>{course.code}</span>
              <span>•</span>
              <span>
                {course.term} {course.year}
              </span>
              {course.instructor && (
                <>
                  <span>•</span>
                  <span>{course.instructor.name}</span>
                </>
              )}
            </div>
          </div>

          <div className='flex space-x-3'>
            <Button
              onClick={handleEditCourse}
              className='bg-blue-600 hover:bg-blue-700 text-white'
            >
              Edit Course
            </Button>
            <Button
              onClick={handleDeleteCourse}
              disabled={deleting}
              variant='destructive'
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              {deleting ? "Deleting..." : "Delete Course"}
            </Button>
          </div>
        </div>

        {error && (
          <div className='mb-8 p-4 bg-red-900/50 text-red-200 rounded-md border border-red-800'>
            {error}
          </div>
        )}

        {/* About Course Cards */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-white mb-6'>
            Course Overview
          </h2>
          <CourseAboutCards course={course} documentsCount={documents.length} />
        </div>

        <div className='space-y-8'>
          {/* Course Information */}
          <div className='space-y-8'>
            <div className='p-6 rounded-lg border border-gray-700'>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                Course Description
              </h2>
              <p className='text-gray-300 leading-relaxed whitespace-pre-wrap'>
                {course.description}
              </p>
            </div>

            {/* Documents Section */}
            <div className='p-6 rounded-lg border border-gray-700'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-semibold text-white'>
                  Course Documents
                </h2>
                <span className='text-gray-400 text-sm'>
                  {documents.length} document{documents.length !== 1 ? "s" : ""}
                </span>
              </div>

              <DocumentList
                courseId={courseId}
                userId={user.uid}
                onDocumentDeleted={() => {
                  // Refresh documents list when a document is deleted
                  apiService.getCourseMaterials(courseId).then(setDocuments);
                }}
              />
            </div>

            {/* Course Info Card */}
            <div className='p-6 rounded-lg border border-gray-700'>
              <h3 className='text-lg font-semibold mb-4 text-white'>
                Course Information
              </h3>
              <div className='space-y-3 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Code:</span>
                  <span className='text-gray-300'>{course.code}</span>
                </div>
                {course.instructor && (
                  <div className='flex justify-between'>
                    <span className='text-gray-400'>Instructor:</span>
                    <span className='text-gray-300'>{course.instructor.name}</span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Term:</span>
                  <span className='text-gray-300'>
                    {course.term} {course.year}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Created:</span>
                  <span className='text-gray-300'>
                    {new Date(course.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Updated:</span>
                  <span className='text-gray-300'>
                    {new Date(course.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Keywords and Prompts */}
        <div className='mt-12'>
          <h2 className='text-xl font-semibold text-white mb-6'>
            Student Insights
          </h2>
          <TopKeywords courseCode={course.code} />
        </div>

        {/* Student Usage Analytics */}
        <div className='mt-12'>
          <h2 className='text-xl font-semibold text-white mb-6'>
            Usage Analytics
          </h2>
          <StudentUsageCharts courseCode={course.code} />
        </div>
      </div>
    </RequireAuth>
  );
}

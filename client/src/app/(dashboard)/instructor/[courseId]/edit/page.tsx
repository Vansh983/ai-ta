"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiService, type Course } from "@/lib/services/api";
import { useAuth } from "@/contexts/AuthContext";
import RequireAuth from "@/components/auth/RequireAuth";

export default function EditCoursePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseFaculty, setCourseFaculty] = useState("");
  const [courseTerm, setCourseTerm] = useState<"Fall" | "Winter" | "Summer">(
    "Fall"
  );
  const [courseYear, setCourseYear] = useState(new Date().getFullYear());
  const [courseDescription, setCourseDescription] = useState("");

  // Fetch course when component mounts
  useEffect(() => {
    const fetchCourse = async () => {
      if (!user || !courseId) return;

      try {
        setLoading(true);
        const courseData = await apiService.getCourse(courseId);

        // Check if user owns this course
        if (courseData.userId !== user.uid) {
          setError("You don't have permission to edit this course.");
          return;
        }

        setCourse(courseData);

        // Populate form fields
        setCourseName(courseData.name);
        setCourseCode(courseData.code);
        setCourseFaculty(courseData.faculty);
        setCourseTerm(courseData.term);
        setCourseYear(courseData.year);
        setCourseDescription(courseData.description);

        setError("");
      } catch (err) {
        setError("Failed to load course data. Please try again.");
        console.error("Error fetching course:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [user, courseId]);

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course) return;

    if (courseName && courseCode && courseFaculty && courseDescription) {
      try {
        setSaving(true);
        const courseData = {
          name: courseName,
          code: courseCode,
          faculty: courseFaculty,
          term: courseTerm,
          year: courseYear,
          description: courseDescription,
        };

        await apiService.updateCourse(courseId, courseData);

        // Redirect back to course detail page
        router.push(`/instructor/${courseId}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update course"
        );
        console.error("Error updating course:", err);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleCancel = () => {
    router.push(`/instructor/${courseId}`);
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
        <div className='flex items-center justify-between mb-8'>
          <div className='space-y-2'>
            <div className='flex items-center space-x-4'>
              <Button
                variant='outline'
                onClick={handleCancel}
                className='border-gray-700 text-gray-300 hover:bg-gray-700'
              >
                ← Back to Course
              </Button>
              <h1 className='text-3xl font-bold text-white'>Edit Course</h1>
            </div>
            <p className='text-gray-400'>
              Editing:{" "}
              <span className='text-gray-300 font-medium'>{course.name}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className='mb-8 p-4 bg-red-900/50 text-red-200 rounded-md border border-red-800'>
            {error}
          </div>
        )}

        <div className='max-w-4xl'>
          <div className='p-6 rounded-lg border border-gray-700'>
            <h2 className='text-xl font-semibold mb-6 text-white'>
              Course Information
            </h2>
            <form onSubmit={handleUpdateCourse} className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Course Name
                  </label>
                  <input
                    type='text'
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className='w-full p-3 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    placeholder='e.g., Introduction to Computer Science'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Course Code
                  </label>
                  <input
                    type='text'
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className='w-full p-3 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    placeholder='e.g., CSCI3120'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium mb-2 text-gray-300'>
                  Faculty
                </label>
                <input
                  type='text'
                  value={courseFaculty}
                  onChange={(e) => setCourseFaculty(e.target.value)}
                  className='w-full p-3 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                  placeholder='e.g., Computer Science'
                  required
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Term
                  </label>
                  <select
                    value={courseTerm}
                    onChange={(e) =>
                      setCourseTerm(
                        e.target.value as "Fall" | "Winter" | "Summer"
                      )
                    }
                    className='w-full p-3 bg-[#343541] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                  >
                    <option value='Fall'>Fall</option>
                    <option value='Winter'>Winter</option>
                    <option value='Summer'>Summer</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium mb-2 text-gray-300'>
                    Year
                  </label>
                  <input
                    type='number'
                    value={courseYear}
                    onChange={(e) => setCourseYear(parseInt(e.target.value))}
                    className='w-full p-3 bg-[#343541] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    min='2020'
                    max='2030'
                    required
                  />
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium mb-2 text-gray-300'>
                  Description
                </label>
                <textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  className='w-full p-3 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent min-h-[150px]'
                  placeholder='Provide a detailed description of the course content, objectives, and requirements...'
                  required
                />
              </div>

              <div className='flex gap-4 pt-6'>
                <Button
                  type='submit'
                  className='flex-1 bg-[#19C37D] hover:bg-[#15A36B] text-white'
                  disabled={
                    saving ||
                    !courseName ||
                    !courseCode ||
                    !courseFaculty ||
                    !courseDescription
                  }
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleCancel}
                  className='flex-1 border-gray-700 text-gray-300 hover:bg-gray-700'
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          <div className='mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700'>
            <div className='flex items-center space-x-2 text-gray-400 text-sm'>
              <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
                  clipRule='evenodd'
                />
              </svg>
              <span>
                Course documents are managed separately. Visit the course page
                to upload or manage documents.
              </span>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

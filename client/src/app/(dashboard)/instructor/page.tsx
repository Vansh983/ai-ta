"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/components/DocumentUpload";
import {
  createCourse,
  getUserCourses,
  uploadDocument,
  updateCourse,
  deleteCourse,
} from "@/lib/firebase/firebase.utils";
import type { Document } from "@/lib/firebase/firebase.utils";
import { useAuth } from "@/contexts/AuthContext";
import RequireAuth from "@/components/auth/RequireAuth";

interface Course {
  id: string;
  name: string;
  code: string;
  faculty: string;
  term: "Fall" | "Winter" | "Summer";
  year: number;
  description: string;
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface PendingDocument {
  file: File;
  name: string;
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseFaculty, setCourseFaculty] = useState("");
  const [courseTerm, setCourseTerm] = useState<"Fall" | "Winter" | "Summer">(
    "Fall"
  );
  const [courseYear, setCourseYear] = useState(new Date().getFullYear());
  const [courseDescription, setCourseDescription] = useState("");
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>(
    []
  );
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  // Fetch courses when component mounts
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const fetchedCourses = await getUserCourses(user.uid);
        // Convert string[] to Document[] for compatibility
        const coursesWithDocuments = fetchedCourses.map((course) => ({
          ...course,
          documents: course.documents.map((doc) => ({
            id: doc,
            name: doc,
            url: "",
            courseId: course.id,
            type: "application/pdf",
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
            uploadedBy: course.userId,
            size: 0,
          })),
        }));
        setCourses(coursesWithDocuments);
        setError("");
      } catch (err) {
        setError("Failed to load courses. Please try again.");
        console.error("Error fetching courses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const handleCreateOrUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (courseName && courseCode && courseFaculty && courseDescription) {
      try {
        setUploadingDocuments(true);
        const courseData = {
          name: courseName,
          code: courseCode,
          faculty: courseFaculty,
          term: courseTerm,
          year: courseYear,
          description: courseDescription,
          userId: user.uid,
        };

        let updatedCourse;
        if (currentCourseId) {
          // Update existing course
          updatedCourse = await updateCourse(currentCourseId, courseData);
        } else {
          // Create new course
          updatedCourse = await createCourse(courseData);
        }

        // Upload all pending documents
        const uploadPromises = pendingDocuments.map((pendingDoc) =>
          uploadDocument(pendingDoc.file, updatedCourse.id, user.uid)
        );

        const uploadedDocuments = await Promise.all(uploadPromises);

        // Update the courses state
        if (currentCourseId) {
          const existingCourse = courses.find((c) => c.id === currentCourseId);
          if (existingCourse) {
            setCourses(
              courses.map((course) =>
                course.id === currentCourseId
                  ? ({
                      ...updatedCourse,
                      documents: [...course.documents, ...uploadedDocuments],
                      createdAt: existingCourse.createdAt,
                    } as Course)
                  : course
              )
            );
          }
        } else {
          const timestamp = new Date();
          setCourses([
            {
              ...updatedCourse,
              documents: uploadedDocuments,
              createdAt: timestamp,
            } as Course,
            ...courses,
          ]);
        }

        // Reset form if it was a new course
        if (!currentCourseId) {
          setCourseName("");
          setCourseCode("");
          setCourseFaculty("");
          setCourseTerm("Fall");
          setCourseYear(new Date().getFullYear());
          setCourseDescription("");
        }
        setPendingDocuments([]);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save course");
        console.error("Error saving course:", err);
      } finally {
        setUploadingDocuments(false);
      }
    }
  };

  const handlePendingDocumentUpload = (file: File) => {
    setPendingDocuments((prev) => [...prev, { file, name: file.name }]);
  };

  const handleRemovePendingDocument = (fileName: string) => {
    setPendingDocuments((prev) => prev.filter((doc) => doc.name !== fileName));
  };

  const handleCourseSelect = (course: Course) => {
    setCurrentCourseId(course.id);
    setCourseName(course.name);
    setCourseCode(course.code);
    setCourseFaculty(course.faculty);
    setCourseTerm(course.term);
    setCourseYear(course.year);
    setCourseDescription(course.description);
    // Clear any pending documents
    setPendingDocuments([]);
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setCurrentCourseId(null);
    setCourseName("");
    setCourseCode("");
    setCourseFaculty("");
    setCourseTerm("Fall");
    setCourseYear(new Date().getFullYear());
    setCourseDescription("");
    setPendingDocuments([]);
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent course selection when clicking delete
    if (!user) return;

    try {
      setDeletingCourseId(courseId);
      await deleteCourse(courseId, user.uid);
      setCourses(courses.filter((course) => course.id !== courseId));
      if (currentCourseId === courseId) {
        handleCancelEdit();
      }
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
        <h1 className='text-3xl font-bold mb-8 text-white'>New Course</h1>

        {error && (
          <div className='mb-8 p-4 bg-red-900/50 text-red-200 rounded-md border border-red-800'>
            {error}
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div className='space-y-8'>
            <div className='p-6 rounded-lg border border-gray-700 '>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                {currentCourseId ? "Update Course" : "Create New Course"}
              </h2>
              <form onSubmit={handleCreateOrUpdateCourse} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Course Name
                  </label>
                  <input
                    type='text'
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Course Code
                  </label>
                  <input
                    type='text'
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    placeholder='e.g., CSCI3120'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Faculty
                  </label>
                  <input
                    type='text'
                    value={courseFaculty}
                    onChange={(e) => setCourseFaculty(e.target.value)}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Term
                  </label>
                  <select
                    value={courseTerm}
                    onChange={(e) =>
                      setCourseTerm(
                        e.target.value as "Fall" | "Winter" | "Summer"
                      )
                    }
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                  >
                    <option value='Fall'>Fall</option>
                    <option value='Winter'>Winter</option>
                    <option value='Summer'>Summer</option>
                  </select>
                </div>

                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Year
                  </label>
                  <input
                    type='number'
                    value={courseYear}
                    onChange={(e) => setCourseYear(parseInt(e.target.value))}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    required
                  />
                </div>

                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Description
                  </label>
                  <textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent min-h-[100px]'
                    required
                  />
                </div>

                <div className='flex gap-4'>
                  <Button
                    type='submit'
                    className='flex-1 bg-[#19C37D] hover:bg-[#15A36B] text-white'
                    disabled={
                      uploadingDocuments ||
                      !courseName ||
                      !courseCode ||
                      !courseFaculty ||
                      !courseDescription ||
                      (!currentCourseId && pendingDocuments.length === 0)
                    }
                  >
                    {uploadingDocuments
                      ? "Saving..."
                      : currentCourseId
                      ? "Update Course"
                      : "Create Course"}
                  </Button>
                  {currentCourseId && (
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleCancelEdit}
                      className='flex-1 border-gray-700 text-gray-300 hover:bg-gray-700'
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>

          <div className='space-y-8'>
            <div className='p-6 rounded-lg border border-gray-700'>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                Course Documents
              </h2>
              <DocumentUpload
                courseId={null}
                userId={user?.uid || ""}
                onUploadComplete={(file) =>
                  handlePendingDocumentUpload(file as unknown as File)
                }
                isPending={true}
              />
              {pendingDocuments.length > 0 && (
                <div className='mt-4'>
                  <h4 className='font-medium mb-2 text-gray-300'>
                    Pending Uploads:
                  </h4>
                  <ul className='space-y-2'>
                    {pendingDocuments.map((doc) => (
                      <li
                        key={doc.name}
                        className='flex items-center justify-between text-gray-300'
                      >
                        <span>{doc.name}</span>
                        <button
                          type='button'
                          onClick={() => handleRemovePendingDocument(doc.name)}
                          className='text-red-400 hover:text-red-300'
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className='p-6 rounded-lg border border-gray-700'>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                Your Courses
              </h2>
              {loading ? (
                <p className='text-gray-300'>Loading courses...</p>
              ) : courses.length === 0 ? (
                <p className='text-gray-300'>
                  No courses found. Create one above!
                </p>
              ) : (
                <div className='space-y-4'>
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors relative group ${
                        currentCourseId === course.id
                          ? "bg-[#19C37D]/10 border-[#19C37D]"
                          : "bg-[#343541] border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => handleCourseSelect(course)}
                    >
                      <h3 className='font-semibold text-white'>
                        {course.name}
                      </h3>
                      <p className='text-sm text-gray-300'>{course.code}</p>
                      <p className='text-sm text-gray-400'>
                        {course.term} {course.year}
                      </p>
                      <p className='text-sm text-gray-400 mt-2'>
                        {course.faculty}
                      </p>
                      <button
                        onClick={(e) => handleDeleteCourse(course.id, e)}
                        disabled={deletingCourseId === course.id}
                        className='absolute top-2 right-2 p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity'
                        title='Delete course'
                      >
                        {deletingCourseId === course.id ? (
                          <span className='text-sm'>Deleting...</span>
                        ) : (
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-5 w-5'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                          >
                            <path
                              fillRule='evenodd'
                              d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
                              clipRule='evenodd'
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

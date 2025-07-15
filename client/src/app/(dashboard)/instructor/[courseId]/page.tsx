"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentList from "@/components/DocumentList";
import {
  getCourse,
  uploadDocument,
  deleteCourse,
  getCourseDocuments,
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
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export default function CourseDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch course and documents when component mounts
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!user || !courseId) return;

      try {
        setLoading(true);

        // Fetch course details and documents in parallel
        const [courseData, courseDocuments] = await Promise.all([
          getCourse(courseId),
          getCourseDocuments(courseId, user.uid),
        ]);

        // Check if user owns this course
        if (courseData.userId !== user.uid) {
          setError("You don't have permission to view this course.");
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

  const handleDocumentUpload = async (document: Document | File) => {
    if (!user || !courseId) return;

    try {
      setUploading(true);

      // If it's a File, upload it. If it's already a Document, just add it to the list
      if (document instanceof File) {
        const uploadedDocument = await uploadDocument(
          document,
          courseId,
          user.uid
        );
        setDocuments((prev) => [uploadedDocument, ...prev]);
      } else {
        // It's already a Document, just add it to the list
        setDocuments((prev) => [document, ...prev]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload document"
      );
      console.error("Error uploading document:", err);
    } finally {
      setUploading(false);
    }
  };

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
      await deleteCourse(courseId, user.uid);
      router.push("/instructor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete course");
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
              <span>•</span>
              <span>{course.faculty}</span>
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

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Course Information */}
          <div className='lg:col-span-2 space-y-8'>
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
                  getCourseDocuments(courseId, user.uid).then(setDocuments);
                }}
              />
            </div>
          </div>

          {/* Document Upload Sidebar */}
          <div className='space-y-8'>
            <div className='p-6 rounded-lg border border-gray-700'>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                Upload Documents
              </h2>
              <p className='text-gray-400 text-sm mb-4'>
                Add course materials, syllabus, lecture notes, assignments, and
                other relevant documents.
              </p>

              <DocumentUpload
                courseId={courseId}
                userId={user.uid}
                onUploadComplete={handleDocumentUpload}
                isPending={false}
              />

              {uploading && (
                <div className='mt-4 p-3 bg-blue-900/50 text-blue-200 rounded-md border border-blue-800'>
                  Uploading document...
                </div>
              )}
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
                <div className='flex justify-between'>
                  <span className='text-gray-400'>Faculty:</span>
                  <span className='text-gray-300'>{course.faculty}</span>
                </div>
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
      </div>
    </RequireAuth>
  );
}

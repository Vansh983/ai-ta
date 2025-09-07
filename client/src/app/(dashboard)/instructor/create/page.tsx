"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/components/DocumentUpload";
import { apiService } from "@/lib/services/api";
import { useAuth } from "@/contexts/AuthContext";
import RequireAuth from "@/components/auth/RequireAuth";

interface PendingDocument {
  file: File;
  name: string;
}

export default function CreateCoursePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseTerm, setCourseTerm] = useState<"Fall" | "Winter" | "Summer">(
    "Fall"
  );
  const [courseYear, setCourseYear] = useState(new Date().getFullYear());
  const [courseDescription, setCourseDescription] = useState("");
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>(
    []
  );
  const [creating, setCreating] = useState(false);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (courseName && courseCode && courseDescription) {
      try {
        setCreating(true);
        const courseData = {
          name: courseName,
          code: courseCode,
          term: courseTerm,
          year: courseYear,
          description: courseDescription,
        };

        // Create new course
        const newCourse = await apiService.createCourse(courseData);

        // Upload all pending documents
        if (pendingDocuments.length > 0) {
          console.log(`Uploading ${pendingDocuments.length} documents...`);
          const uploadPromises = pendingDocuments.map(async (pendingDoc) => {
            try {
              await apiService.uploadMaterial(newCourse.id, pendingDoc.file);
              return { success: true, fileName: pendingDoc.name };
            } catch (error) {
              console.error(`Failed to upload ${pendingDoc.name}:`, error);
              return { success: false, fileName: pendingDoc.name, error };
            }
          });
          
          const uploadResults = await Promise.all(uploadPromises);
          const failedUploads = uploadResults.filter(result => !result.success);
          
          if (failedUploads.length > 0) {
            const failedFileNames = failedUploads.map(result => result.fileName).join(', ');
            setError(`Course created successfully, but failed to upload some documents: ${failedFileNames}. You can upload them later from the course page.`);
            console.warn('Failed uploads:', failedUploads);
          }
        }

        // Redirect to the new course page
        router.push(`/instructor/${newCourse.id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create course"
        );
        console.error("Error creating course:", err);
      } finally {
        setCreating(false);
      }
    }
  };

  const handlePendingDocumentUpload = (file: File) => {
    setPendingDocuments((prev) => [...prev, { file, name: file.name }]);
  };

  const handleRemovePendingDocument = (fileName: string) => {
    setPendingDocuments((prev) => prev.filter((doc) => doc.name !== fileName));
  };

  const handleCancel = () => {
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

  return (
    <RequireAuth allowedRoles={["instructor", "admin"]}>
      <div className='container p-8'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-3xl font-bold text-white'>Create New Course</h1>
          <Button
            variant='outline'
            onClick={handleCancel}
            className='border-gray-700 text-gray-300 hover:bg-gray-700'
          >
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className='mb-8 p-4 bg-red-900/50 text-red-200 rounded-md border border-red-800'>
            {error}
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <div className='space-y-8'>
            <div className='p-6 rounded-lg border border-gray-700'>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                Course Information
              </h2>
              <form onSubmit={handleCreateCourse} className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Course Name
                  </label>
                  <input
                    type='text'
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent'
                    placeholder='e.g., Introduction to Computer Science'
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


                <div className='grid grid-cols-2 gap-4'>
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
                      min='2020'
                      max='2030'
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium mb-1 text-gray-300'>
                    Description
                  </label>
                  <textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    className='w-full p-2 bg-[#343541] border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent min-h-[120px]'
                    placeholder='Provide a detailed description of the course content, objectives, and requirements...'
                    required
                  />
                </div>

                <div className='flex gap-4 pt-4'>
                  <Button
                    type='submit'
                    className='flex-1 bg-[#19C37D] hover:bg-[#15A36B] text-white'
                    disabled={
                      creating ||
                      !courseName ||
                      !courseCode ||
                      !courseDescription
                    }
                  >
                    {creating ? "Creating Course..." : "Create Course"}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleCancel}
                    className='flex-1 border-gray-700 text-gray-300 hover:bg-gray-700'
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className='space-y-8'>
            <div className='p-6 rounded-lg border border-gray-700'>
              <h2 className='text-xl font-semibold mb-4 text-white'>
                Course Documents
              </h2>
              <p className='text-gray-400 text-sm mb-4'>
                Upload course materials, syllabus, lecture notes, and other
                relevant documents. You can also add documents later after
                creating the course.
              </p>
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
                    Documents to Upload ({pendingDocuments.length}):
                  </h4>
                  <ul className='space-y-2'>
                    {pendingDocuments.map((doc) => (
                      <li
                        key={doc.name}
                        className='flex items-center justify-between p-2 bg-[#343541] rounded border border-gray-700'
                      >
                        <span className='text-gray-300 text-sm truncate flex-1'>
                          {doc.name}
                        </span>
                        <button
                          type='button'
                          onClick={() => handleRemovePendingDocument(doc.name)}
                          className='ml-2 text-red-400 hover:text-red-300 text-sm'
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import DocumentUpload from "@/components/DocumentUpload";
import { createCourse, getUserCourses, uploadDocument, updateCourse } from "@/lib/firebase/firebase.utils";
import type { Document } from "@/lib/firebase/firebase.utils";
import { useAuth } from "@/contexts/AuthContext";
import RequireAuth from "@/components/auth/RequireAuth";

interface Course {
    id: string;
    name: string;
    code: string;
    faculty: string;
    term: 'Fall' | 'Winter' | 'Summer';
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
    const [courseTerm, setCourseTerm] = useState<'Fall' | 'Winter' | 'Summer'>('Fall');
    const [courseYear, setCourseYear] = useState(new Date().getFullYear());
    const [courseDescription, setCourseDescription] = useState("");
    const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
    const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
    const [uploadingDocuments, setUploadingDocuments] = useState(false);

    // Fetch courses when component mounts
    useEffect(() => {
        const fetchCourses = async () => {
            if (!user) return;

            try {
                setLoading(true);
                const fetchedCourses = await getUserCourses(user.uid);
                // Convert string[] to Document[] for compatibility
                const coursesWithDocuments = fetchedCourses.map(course => ({
                    ...course,
                    documents: course.documents.map(doc => ({
                        id: doc,
                        name: doc,
                        url: '',
                        courseId: course.id,
                        type: 'application/pdf',
                        createdAt: course.createdAt,
                        updatedAt: course.updatedAt,
                        uploadedBy: course.userId,
                        size: 0
                    }))
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
                const uploadPromises = pendingDocuments.map(pendingDoc =>
                    uploadDocument(pendingDoc.file, updatedCourse.id, user.uid)
                );

                const uploadedDocuments = await Promise.all(uploadPromises);

                // Update the courses state
                if (currentCourseId) {
                    const existingCourse = courses.find(c => c.id === currentCourseId);
                    if (existingCourse) {
                        setCourses(courses.map(course =>
                            course.id === currentCourseId
                                ? {
                                    ...updatedCourse,
                                    documents: [...course.documents, ...uploadedDocuments],
                                    createdAt: existingCourse.createdAt
                                } as Course
                                : course
                        ));
                    }
                } else {
                    const timestamp = new Date();
                    setCourses([{
                        ...updatedCourse,
                        documents: uploadedDocuments,
                        createdAt: timestamp
                    } as Course, ...courses]);
                }

                // Reset form if it was a new course
                if (!currentCourseId) {
                    setCourseName("");
                    setCourseCode("");
                    setCourseFaculty("");
                    setCourseTerm('Fall');
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
        setPendingDocuments(prev => [...prev, { file, name: file.name }]);
    };

    const handleRemovePendingDocument = (fileName: string) => {
        setPendingDocuments(prev => prev.filter(doc => doc.name !== fileName));
    };

    const handleDocumentUpload = (courseId: string, document: Document) => {
        setCourses(courses.map(course => {
            if (course.id === courseId) {
                return {
                    ...course,
                    documents: [...course.documents, document],
                    updatedAt: new Date()
                };
            }
            return course;
        }));
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setCurrentCourseId(null);
        setCourseName("");
        setCourseCode("");
        setCourseFaculty("");
        setCourseTerm('Fall');
        setCourseYear(new Date().getFullYear());
        setCourseDescription("");
        setPendingDocuments([]);
    };

    if (!user) {
        return (
            <div className="container py-8">
                <p className="text-center text-muted-foreground">Please sign in to access the instructor dashboard.</p>
            </div>
        );
    }

    return (
        <RequireAuth allowedRoles={['instructor', 'admin']}>
            <div className="container py-8">
                <h1 className="text-3xl font-bold mb-8">Instructor Dashboard</h1>

                {error && (
                    <div className="mb-8 p-4 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <div className="p-6 bg-card rounded-lg shadow">
                            <h2 className="text-xl font-semibold mb-4">
                                {currentCourseId ? "Update Course" : "Create New Course"}
                            </h2>
                            <form onSubmit={handleCreateOrUpdateCourse} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Course Name
                                    </label>
                                    <input
                                        type="text"
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Course Code
                                    </label>
                                    <input
                                        type="text"
                                        value={courseCode}
                                        onChange={(e) => setCourseCode(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="e.g., CSCI3120"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Faculty
                                    </label>
                                    <input
                                        type="text"
                                        value={courseFaculty}
                                        onChange={(e) => setCourseFaculty(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        placeholder="e.g., Computer Science"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Term
                                        </label>
                                        <select
                                            value={courseTerm}
                                            onChange={(e) => setCourseTerm(e.target.value as 'Fall' | 'Winter' | 'Summer')}
                                            className="w-full p-2 border rounded-md"
                                            required
                                        >
                                            <option value="Fall">Fall</option>
                                            <option value="Winter">Winter</option>
                                            <option value="Summer">Summer</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">
                                            Year
                                        </label>
                                        <input
                                            type="number"
                                            value={courseYear}
                                            onChange={(e) => setCourseYear(parseInt(e.target.value))}
                                            className="w-full p-2 border rounded-md"
                                            min={2000}
                                            max={2100}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Course Description
                                    </label>
                                    <textarea
                                        value={courseDescription}
                                        onChange={(e) => setCourseDescription(e.target.value)}
                                        className="w-full p-2 border rounded-md"
                                        rows={3}
                                        required
                                    />
                                </div>

                                <div className="mt-6">
                                    <h3 className="text-lg font-medium mb-2">Upload Course Materials</h3>
                                    <div className="mb-4">
                                        <DocumentUpload
                                            courseId={null}
                                            userId={user?.uid || ""}
                                            onUploadComplete={(file) => handlePendingDocumentUpload(file as unknown as File)}
                                            isPending={true}
                                        />
                                    </div>
                                    {pendingDocuments.length > 0 && (
                                        <div className="mt-4">
                                            <h4 className="font-medium mb-2">Pending Uploads:</h4>
                                            <ul className="space-y-2">
                                                {pendingDocuments.map((doc) => (
                                                    <li key={doc.name} className="flex items-center justify-between">
                                                        <span>{doc.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePendingDocument(doc.name)}
                                                            className="text-red-600 hover:text-red-800"
                                                        >
                                                            Remove
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <Button type="submit" disabled={uploadingDocuments}>
                                        {uploadingDocuments
                                            ? "Saving..."
                                            : currentCourseId
                                                ? "Update Course"
                                                : "Create Course"
                                        }
                                    </Button>
                                    {currentCourseId && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel Edit
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>


                    </div>

                    <div className="p-6 bg-card rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
                        {loading ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Loading courses...</p>
                            </div>
                        ) : courses.length === 0 ? (
                            <p className="text-muted-foreground">No courses created yet.</p>
                        ) : (
                            <div className="space-y-6">
                                {courses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="p-4 border rounded-md hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <h3 className="font-medium">{course.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {course.code} • {course.faculty} • {course.term} {course.year}
                                                </p>
                                            </div>
                                            <Button
                                                variant="secondary" size="sm"
                                                onClick={() => handleCourseSelect(course)}
                                            >
                                                Edit Course
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {course.description}
                                        </p>
                                        <div className="text-sm">
                                            <h4 className="font-medium mb-2">Course Materials ({course.documents.length})</h4>
                                            {course.documents.length === 0 ? (
                                                <p className="text-muted-foreground">No documents uploaded yet</p>
                                            ) : (
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {course.documents.map((doc) => (
                                                        <li key={doc.id}>
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                {doc.name}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
} 
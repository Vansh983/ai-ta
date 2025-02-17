"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Course {
    id: string;
    name: string;
    description: string;
    files: File[];
}

export default function InstructorDashboard() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [courseName, setCourseName] = useState("");
    const [courseDescription, setCourseDescription] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile && courseName && courseDescription) {
            const newCourse: Course = {
                id: Date.now().toString(),
                name: courseName,
                description: courseDescription,
                files: [selectedFile],
            };
            setCourses([...courses, newCourse]);
            setSelectedFile(null);
            setCourseName("");
            setCourseDescription("");
        }
    };

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">Instructor Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-card rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Upload New Course</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Course Materials
                            </label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full"
                                accept=".pdf,.doc,.docx,.txt"
                                required
                            />
                        </div>

                        <Button type="submit">Upload Course</Button>
                    </form>
                </div>

                <div className="p-6 bg-card rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
                    {courses.length === 0 ? (
                        <p className="text-muted-foreground">No courses uploaded yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="p-4 border rounded-md hover:bg-accent/50 transition-colors"
                                >
                                    <h3 className="font-medium">{course.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {course.description}
                                    </p>
                                    <p className="text-sm mt-2">
                                        Files: {course.files.map((file) => file.name).join(", ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 
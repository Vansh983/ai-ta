"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase.config";
import { toast } from "sonner";

interface Course {
    id: string;
    name: string;
    code: string;
    faculty: string;
    term: 'Fall' | 'Winter' | 'Summer';
    year: number;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    documents: string[];
    userId: string;
}

export function MainNav() {
    const { user, userRole, loading: authLoading, signOut } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentCourseId = searchParams.get('course');

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            if (authLoading) return;

            try {
                const coursesRef = collection(db, 'courses');
                const coursesSnap = await getDocs(coursesRef);
                const coursesData = coursesSnap.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate(),
                })) as Course[];

                console.log('Fetched courses:', coursesData);
                setCourses(coursesData);
            } catch (error) {
                console.error("Error fetching courses:", error);
                toast.error("Failed to fetch courses");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            console.log('Auth state:', { user, userRole, authLoading });
            fetchCourses();
        }
    }, [authLoading]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Failed to sign out:', error);
        }
    };

    const showCourseList = !authLoading && user;
    console.log('Show course list:', { showCourseList, authLoading, user, userRole });

    const showInstructorDashboard = !authLoading && user && userRole === 'instructor';

    return (
        <div className="flex-1 flex flex-col">
            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto">
                {showCourseList ? (
                    <div className="px-2 py-4">
                        <h3 className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase">Available Courses</h3>
                        {loading ? (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : courses.length > 0 ? (
                            <div className="space-y-1">
                                {courses.map((course) => {
                                    console.log('Rendering course:', course);
                                    return (
                                        <Link
                                            key={course.id}
                                            href={`/student?course=${course.id}`}
                                            className={`block px-3 py-2 rounded-lg text-sm ${pathname === '/student' && currentCourseId === course.id
                                                ? "bg-[#343541] text-white"
                                                : "text-gray-300 hover:bg-[#2A2B32]"
                                                }`}
                                        >
                                            <div className="font-medium truncate">{course.name}</div>
                                            <div className="text-xs text-gray-400 truncate">
                                                {course.code} • {course.term} {course.year}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 p-4">
                                No courses available
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="px-2 py-4">
                        <p className="text-center text-gray-400 p-4">
                            {authLoading ? "Loading..." : !user ? "Please sign in" : "Not a student"}
                        </p>
                    </div>
                )}

                {showInstructorDashboard && (
                    <div className="px-2 py-4">
                        <Link
                            href="/instructor"
                            className={`block px-3 py-2 rounded-lg text-sm ${pathname === "/instructor"
                                ? "bg-[#343541] text-white"
                                : "text-gray-300 hover:bg-[#2A2B32]"
                                }`}
                        >
                            Instructor Dashboard
                        </Link>
                    </div>
                )}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-gray-700">
                {user ? (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-400 truncate">
                            {user.email}
                            <span className="block text-xs opacity-70">({userRole})</span>
                        </p>
                        <button
                            onClick={handleSignOut}
                            className="w-full px-3 py-2 text-sm text-white bg-[#343541] hover:bg-[#444654] rounded-lg transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Link
                            href="/auth/signin"
                            className="block w-full px-3 py-2 text-sm text-center text-white bg-[#343541] hover:bg-[#444654] rounded-lg transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="block w-full px-3 py-2 text-sm text-center text-white bg-[#19C37D] hover:bg-[#15A36B] rounded-lg transition-colors"
                        >
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
} 
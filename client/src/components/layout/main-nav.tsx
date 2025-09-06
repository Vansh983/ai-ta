"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiService, type Course } from "@/lib/services/api";

export function MainNav() {
  const { user, loading: authLoading, signOut } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCourseId = searchParams.get("course");

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (authLoading || !user) return;

      try {
        const coursesData = await apiService.getCourses();

        // Filter courses based on user role
        const filteredCourses =
          user.role === "instructor"
            ? coursesData.filter((course) => course.userId === user.uid)
            : coursesData;

        console.log("Fetched courses:", filteredCourses);
        setCourses(filteredCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Failed to fetch courses");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchCourses();
    }
  }, [authLoading, user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const showCourseList = !authLoading && user;

  const showInstructorDashboard =
    !authLoading && user && user.role === "instructor";

  return (
    <div className='flex-1 flex flex-col overflow-hidden'>
      {/* Navigation Links - Scrollable */}
      <nav className='flex-1 overflow-y-auto px-2 py-4'>
        {showCourseList ? (
          <div>
            <h3 className='px-3 mb-2 text-xs font-medium text-gray-400 uppercase'>
              {user?.role === "instructor" ? "My Courses" : "Available Courses"}
            </h3>
            {loading ? (
              <div className='flex items-center justify-center p-4'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
              </div>
            ) : courses.length > 0 ? (
              <div className='space-y-1'>
                {courses.map((course) => {
                  console.log("Rendering course:", course);

                  // Determine the correct href and active state based on user role
                  const href =
                    user?.role === "instructor"
                      ? `/instructor/${course.id}`
                      : `/student?course=${course.id}`;

                  const isActive =
                    user?.role === "instructor"
                      ? pathname === `/instructor/${course.id}`
                      : pathname === "/student" &&
                        currentCourseId === course.id;

                  return (
                    <Link
                      key={course.id}
                      href={href}
                      className={`block px-3 py-2 rounded-lg text-sm ${
                        isActive
                          ? "bg-[#343541] text-white"
                          : "text-gray-300 hover:bg-[#2A2B32]"
                      }`}
                    >
                      <div className='font-medium truncate'>{course.name}</div>
                      <div className='text-xs text-gray-400 truncate'>
                        {course.code} • {course.term} {course.year}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className='text-center text-gray-400 p-4'>
                {user?.role === "instructor"
                  ? "No courses created yet"
                  : "No courses available"}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className='text-center text-gray-400 p-4'>
              {authLoading
                ? "Loading..."
                : !user
                ? "Please sign in"
                : "Not a student"}
            </p>
          </div>
        )}
      </nav>

      {showInstructorDashboard && (
        <Link
          href='/instructor'
          className={`block px-3 py-2 rounded-lg text-sm bg-white mx-4 mb-4`}
        >
          Instructor Dashboard
        </Link>
      )}

      {/* User Section - Fixed at bottom */}
      <div className='flex-shrink-0 p-4 border-t border-gray-700'>
        {user ? (
          <div className='space-y-3'>
            <p className='text-sm text-gray-400 truncate'>
              {user.email}
              <span className='block text-xs opacity-70'>({user.role})</span>
            </p>
            <button
              onClick={handleSignOut}
              className='w-full px-3 py-2 text-sm text-white bg-[#343541] hover:bg-[#444654] rounded-lg transition-colors'
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className='space-y-2'>
            <Link
              href='/auth/signin'
              className='block w-full px-3 py-2 text-sm text-center text-white bg-[#343541] hover:bg-[#444654] rounded-lg transition-colors'
            >
              Sign In
            </Link>
            <Link
              href='/auth/signup'
              className='block w-full px-3 py-2 text-sm text-center text-white bg-[#19C37D] hover:bg-[#15A36B] rounded-lg transition-colors'
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

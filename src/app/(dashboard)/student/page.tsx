"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase.config";

interface Message {
    id: string;
    content: string;
    sender: "user" | "ai";
    timestamp: Date;
}

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

export default function StudentDashboard() {
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const coursesRef = collection(db, 'courses');
                const coursesSnap = await getDocs(coursesRef);
                const coursesData = coursesSnap.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate(),
                })) as Course[];

                setCourses(coursesData);
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const userMessage: Message = {
                id: Date.now().toString(),
                content: newMessage,
                sender: "user",
                timestamp: new Date(),
            };

            // Add user message
            setMessages((prev) => [...prev, userMessage]);

            // Mock AI response
            setTimeout(() => {
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: "This is a mock AI response. In a real implementation, this would be connected to your AI backend.",
                    sender: "ai",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
            }, 1000);

            setNewMessage("");
        }
    };

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">Student Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="p-6 bg-card rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
                        {loading ? (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : courses.length > 0 ? (
                            <div className="space-y-4">
                                {courses.map((course) => (
                                    <button
                                        key={course.id}
                                        onClick={() => setSelectedCourse(course)}
                                        className={`w-full p-4 text-left border rounded-md transition-colors ${selectedCourse?.id === course.id
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-accent/50"
                                            }`}
                                    >
                                        <h3 className="font-medium">{course.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {course.description}
                                        </p>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            <span className="font-medium">{course.code}</span> • {course.term} {course.year}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">No courses available</p>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    {selectedCourse ? (
                        <div className="p-6 bg-card rounded-lg shadow h-[600px] flex flex-col">
                            <div className="border-b pb-4 mb-4">
                                <h2 className="text-xl font-semibold">{selectedCourse.name}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {selectedCourse.description}
                                </p>
                            </div>

                            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-lg ${message.sender === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                                }`}
                                        >
                                            <p>{message.content}</p>
                                            <span className="text-xs opacity-70">
                                                {message.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 p-2 border rounded-md"
                                />
                                <Button type="submit">Send</Button>
                            </form>
                        </div>
                    ) : (
                        <div className="p-6 bg-card rounded-lg shadow h-[600px] flex items-center justify-center">
                            <p className="text-muted-foreground">
                                Select a course to start chatting
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 
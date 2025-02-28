"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase.config";
import { sendMessage, refreshCourse, type ChatMessage, storeMessage, getChatHistory } from "@/lib/services/chat";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/firebase.config";

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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [sampleQuestions] = useState([
        "What are the main topics covered in this course?",
        "What are the prerequisites for this course?",
        "What are the learning objectives of this course?",
    ]);

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
                toast.error("Failed to fetch courses");
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    useEffect(() => {
        const loadChatHistory = async () => {
            if (!selectedCourse) return;

            setLoadingChat(true);
            try {
                const history = await getChatHistory(selectedCourse.id);
                setMessages(history);
            } catch (error) {
                console.error("Error fetching chat history:", error);
                if (error instanceof Error && error.message.includes('requires an index')) {
                    toast.error("Chat history index is being built. Please try again in a few minutes.");
                } else {
                    toast.error("Failed to load chat history");
                }
            } finally {
                setLoadingChat(false);
            }
        };

        loadChatHistory();
    }, [selectedCourse]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !newMessage.trim() || sendingMessage) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: newMessage,
            sender: "user",
            timestamp: new Date(),
            courseId: selectedCourse.id,
            userId: auth.currentUser?.uid,
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage("");
        setSendingMessage(true);

        try {
            await storeMessage(userMessage);

            const response = await sendMessage(selectedCourse.id, userMessage.content);

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: response.answer,
                sender: "ai",
                timestamp: new Date(),
                courseId: selectedCourse.id,
            };

            await storeMessage(aiMessage);

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to get AI response");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleCourseSelect = async (course: Course) => {
        setSelectedCourse(course);
        setMessages([]); // Clear messages when switching courses

        try {
            // Refresh the course content when selected
            await refreshCourse(course.id);
            toast.success("Course content refreshed");
        } catch (error) {
            console.error("Error refreshing course:", error);
            toast.error("Failed to refresh course content");
        }
    };

    const handleQuestionSelect = (question: string) => {
        setNewMessage(question);
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
                                        onClick={() => handleCourseSelect(course)}
                                        className={`w-full p-4 text-left rounded-lg transition-colors ${selectedCourse?.id === course.id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-card hover:bg-accent/50"
                                            }`}
                                    >
                                        <h3 className="font-medium">{course.name}</h3>
                                        <p className="text-sm opacity-80">
                                            {course.code} • {course.term} {course.year}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground">
                                No courses available
                            </p>
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
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium">Sample Questions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {sampleQuestions.map((question, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleQuestionSelect(question)}
                                                className="text-sm px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-full transition-colors"
                                            >
                                                {question}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                                {loadingChat ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
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
                                    ))
                                )}
                            </div>

                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="flex-1 p-2 border rounded-md"
                                    disabled={sendingMessage}
                                />
                                <Button type="submit" disabled={sendingMessage}>
                                    {sendingMessage ? "Sending..." : "Send"}
                                </Button>
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
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { apiService, type Course, type ChatMessage } from "@/lib/services/api";

export default function StudentDashboard() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('course');

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

    // Fetch courses
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const coursesData = await apiService.getCourses();
                setCourses(coursesData);

                // If we have a courseId in URL, select that course
                if (courseId) {
                    const course = coursesData.find(c => c.id === courseId);
                    if (course) {
                        setSelectedCourse(course);
                    }
                }
            } catch (error) {
                console.error("Error fetching courses:", error);
                toast.error("Failed to fetch courses");
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [courseId]);

    // Load chat history when course changes
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!selectedCourse) return;

            setLoadingChat(true);
            try {
                const history = await apiService.getChatHistory(selectedCourse.id);
                setMessages(history);
            } catch (error) {
                console.error("Error fetching chat history:", error);
                toast.error("Failed to load chat history");
            } finally {
                setLoadingChat(false);
            }
        };

        if (selectedCourse) {
            loadChatHistory();
        } else {
            setMessages([]);
        }
    }, [selectedCourse]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse || !newMessage.trim() || sendingMessage) return;

        const courseId = selectedCourse?.id;
        if (!courseId) {
            toast.error("No course selected");
            return;
        }

        const messageContent = newMessage.trim();
        if (!messageContent) {
            toast.error("Message cannot be empty");
            return;
        }

        // Add user message to UI immediately
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: messageContent,
            sender: "user",
            timestamp: new Date(),
            courseId: courseId,
            userId: "current-user", // Will be handled by API service
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage("");
        setSendingMessage(true);

        try {
            // Send message to API
            const response = await apiService.sendChatMessage(courseId, messageContent);

            if (!response || !response.answer) {
                throw new Error("Invalid response from server");
            }

            // Add AI response to messages
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: response.answer,
                sender: "ai",
                timestamp: new Date(),
                courseId: courseId,
                userId: "ai-assistant",
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to get AI response");
            // Remove the user message on failure
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        } finally {
            setSendingMessage(false);
        }
    };

    const handleQuestionSelect = (question: string) => {
        setNewMessage(question);
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-[#343541]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#343541]">
            {selectedCourse ? (
                <>
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-3xl mx-auto py-4 px-6">
                            {/* Course Info */}
                            <div className="mb-8 text-center">
                                <h2 className="text-xl font-semibold text-white mb-2">{selectedCourse.name}</h2>
                                <p className="text-sm text-gray-300">
                                    {selectedCourse.description}
                                </p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    {sampleQuestions.map((question, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuestionSelect(question)}
                                            className="text-sm px-3 py-1.5 bg-[#40414F] text-gray-300 hover:bg-[#202123] rounded-full transition-colors"
                                        >
                                            {question}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Messages */}
                            {loadingChat ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.sender === "user" ? "bg-[#343541]" : "bg-[#444654]"}`}
                                        >
                                            <div className="max-w-3xl mx-auto w-full px-4 py-6">
                                                <div className="flex gap-4 items-start">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.sender === "user" ? "bg-[#5436DA]" : "bg-[#19C37D]"
                                                        }`}>
                                                        {message.sender === "user" ? "U" : "AI"}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white whitespace-pre-wrap">{message.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-gray-700 bg-[#343541] p-4">
                        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Message your AI teaching assistant..."
                                className="w-full p-4 pr-24 bg-[#40414F] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#19C37D]"
                                disabled={sendingMessage}
                            />
                            <Button
                                type="submit"
                                disabled={sendingMessage}
                                className="absolute right-2 top-2 bg-[#19C37D] text-white hover:bg-[#15A36B] disabled:bg-[#40414F]"
                            >
                                {sendingMessage ? "Sending..." : "Send"}
                            </Button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-300">
                    <p>Select a course from the sidebar to start chatting</p>
                </div>
            )}
        </div>
    );
} 
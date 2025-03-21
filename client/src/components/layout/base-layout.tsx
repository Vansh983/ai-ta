import { type ReactNode } from "react";
import { ThemeProvider } from "../providers/theme-provider";
import { MainNav } from "./main-nav";
import { AuthProvider } from "@/contexts/AuthContext";

interface BaseLayoutProps {
    children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <div className="flex min-h-screen bg-[#343541]">
                    {/* Sidebar */}
                    <div className="w-64 bg-[#202123] text-white flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-medium">AI Teaching Assistant</h2>
                        </div>
                        <MainNav />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col">
                        <main className="flex-1 relative">
                            {children}
                        </main>

                        {/* Footer */}
                        <footer className="p-4 border-t border-gray-700">
                            <div className="max-w-7xl mx-auto">
                                <p className="text-sm text-gray-400">
                                    Being developed by Vansh
                                </p>
                            </div>
                        </footer>
                    </div>
                </div>
            </AuthProvider>
        </ThemeProvider>
    );
} 
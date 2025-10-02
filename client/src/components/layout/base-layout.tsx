import { type ReactNode } from "react";
import { ThemeProvider } from "../providers/theme-provider";
import { MainNav } from "./main-nav";
import { AuthProvider } from "@/contexts/AuthContext";
import { TrackingProvider } from "@/providers/TrackingProvider";

interface BaseLayoutProps {
    children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <TrackingProvider 
                    enabled={process.env.NODE_ENV === 'production'} 
                    trackSearchParams={false}
                >
                    <div className="flex h-screen overflow-hidden bg-[#343541]">
                        {/* Fixed Sidebar */}
                        <div className="w-64 flex-shrink-0 bg-[#202123] border-r border-gray-700">
                            <div className="h-screen flex flex-col">
                                <div className="p-4 border-b border-gray-700">
                                    <h2 className="text-lg font-medium text-white">AI Teaching Assistant</h2>
                                </div>
                                <MainNav />
                            </div>
                        </div>

                        {/* Scrollable Main Content */}
                        <main className="flex-1 overflow-auto">
                            {children}
                        </main>
                        <footer className="p-4 bottom-0 fixed left-64">
                            <p className="text-sm text-gray-400">
                                Being developed by Vansh
                            </p>
                        </footer>

                        {/* Footer */}
                    </div>
                </TrackingProvider>
            </AuthProvider>
        </ThemeProvider>
    );
} 
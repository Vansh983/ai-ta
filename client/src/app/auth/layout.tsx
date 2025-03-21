'use client';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-[#343541]">
            {/* Sidebar */}
            <div className="w-64 bg-[#202123] text-white flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-lg font-medium">AI Teaching Assistant</h2>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
} 
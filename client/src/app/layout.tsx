import type { Metadata } from "next";
import "./globals.css";
import { BaseLayout } from "@/components/layout/base-layout";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AI Teaching Assistant",
  description: "A platform for instructors and students to interact with course content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased bg-[#343541]">
        <BaseLayout>{children}</BaseLayout>
        <Toaster />
      </body>
    </html>
  );
}

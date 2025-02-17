import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1 container flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to AI Teaching Assistant</h1>
      <p className="text-xl text-muted-foreground mb-12 max-w-2xl">
        An intelligent platform that connects instructors and students through
        AI-powered course content interaction.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="p-8 bg-card rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">For Instructors</h2>
          <p className="text-muted-foreground mb-8">
            Upload and manage your course content, track student progress, and
            create engaging learning materials.
          </p>
          <Link href="/instructor">
            <Button size="lg">Go to Instructor Dashboard</Button>
          </Link>
        </div>

        <div className="p-8 bg-card rounded-lg shadow-lg flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">For Students</h2>
          <p className="text-muted-foreground mb-8">
            Access course materials, interact with AI-powered assistance, and
            enhance your learning experience.
          </p>
          <Link href="/student">
            <Button size="lg">Go to Student Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="p-6 bg-card rounded-lg shadow">
            <h3 className="font-medium mb-2">AI-Powered Learning</h3>
            <p className="text-sm text-muted-foreground">
              Intelligent assistance based on course materials
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow">
            <h3 className="font-medium mb-2">Easy Content Management</h3>
            <p className="text-sm text-muted-foreground">
              Simple tools for uploading and organizing course content
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow">
            <h3 className="font-medium mb-2">Interactive Experience</h3>
            <p className="text-sm text-muted-foreground">
              Engaging interface for both instructors and students
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

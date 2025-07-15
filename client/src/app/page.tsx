import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-[#343541]">


      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold mb-6 text-white text-center">
            Welcome to AI Teaching Assistant
          </h1>
          <p className="text-xl text-gray-300 mb-12 text-center max-w-2xl mx-auto">
            An intelligent platform that connects instructors and students through
            AI-powered course content interaction.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-[#444654] rounded-lg border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-white">For Instructors</h2>
              <p className="text-gray-300 mb-8">
                Upload and manage your course content, track student progress, and
                create engaging learning materials.
              </p>
              <Link href="/instructor" className="block">
                <Button
                  size="lg"
                  className="w-full bg-[#19C37D] hover:bg-[#15A36B] text-white"
                >
                  Go to Instructor Dashboard
                </Button>
              </Link>
            </div>

            <div className="p-6 bg-[#444654] rounded-lg border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-white">For Students</h2>
              <p className="text-gray-300 mb-8">
                Access course materials, interact with AI-powered assistance, and
                enhance your learning experience.
              </p>
              <Link href="/student" className="block">
                <Button
                  size="lg"
                  className="w-full bg-[#19C37D] hover:bg-[#15A36B] text-white"
                >
                  Go to Student Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

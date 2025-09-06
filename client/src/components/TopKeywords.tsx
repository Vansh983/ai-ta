"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Keyword {
  term: string;
  count: number;
  trend: "up" | "down" | "stable";
  category: string;
}

interface StudentPrompt {
  id: string;
  text: string;
  frequency: number;
  lastAsked: string;
  topic: string;
}

interface TopKeywordsProps {
  courseCode: string;
}

export default function TopKeywords({ courseCode }: TopKeywordsProps) {
  // Generate dummy keywords data
  const keywords: Keyword[] = [
    { term: "recursion", count: 156, trend: "up", category: "Programming" },
    {
      term: "data structures",
      count: 134,
      trend: "up",
      category: "CS Fundamentals",
    },
    {
      term: "algorithms",
      count: 128,
      trend: "stable",
      category: "CS Fundamentals",
    },
    { term: "debugging", count: 98, trend: "down", category: "Programming" },
    { term: "time complexity", count: 87, trend: "up", category: "Algorithms" },
    {
      term: "object oriented",
      count: 76,
      trend: "stable",
      category: "Programming",
    },
    {
      term: "binary trees",
      count: 65,
      trend: "up",
      category: "Data Structures",
    },
    {
      term: "sorting algorithms",
      count: 54,
      trend: "down",
      category: "Algorithms",
    },
    {
      term: "linked lists",
      count: 43,
      trend: "stable",
      category: "Data Structures",
    },
    { term: "inheritance", count: 38, trend: "up", category: "OOP" },
  ];

  // Generate dummy student prompts
  const topPrompts: StudentPrompt[] = [
    {
      id: "1",
      text: "How do I implement a recursive function for factorial?",
      frequency: 23,
      lastAsked: "2 hours ago",
      topic: "Recursion",
    },
    {
      id: "2",
      text: "What's the difference between a stack and a queue?",
      frequency: 19,
      lastAsked: "4 hours ago",
      topic: "Data Structures",
    },
    {
      id: "3",
      text: "Can you explain Big O notation with examples?",
      frequency: 17,
      lastAsked: "1 hour ago",
      topic: "Algorithms",
    },
    {
      id: "4",
      text: "How to fix a segmentation fault in C++?",
      frequency: 15,
      lastAsked: "3 hours ago",
      topic: "Debugging",
    },
    {
      id: "5",
      text: "When should I use inheritance vs composition?",
      frequency: 12,
      lastAsked: "5 hours ago",
      topic: "OOP Design",
    },
    {
      id: "6",
      text: "How to traverse a binary tree in different orders?",
      frequency: 11,
      lastAsked: "6 hours ago",
      topic: "Trees",
    },
    {
      id: "7",
      text: "What are the best practices for code optimization?",
      frequency: 9,
      lastAsked: "8 hours ago",
      topic: "Performance",
    },
    {
      id: "8",
      text: "How do I implement a hash table from scratch?",
      frequency: 8,
      lastAsked: "1 day ago",
      topic: "Data Structures",
    },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return (
          <svg
            className='w-3 h-3 text-green-400'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z'
              clipRule='evenodd'
            />
          </svg>
        );
      case "down":
        return (
          <svg
            className='w-3 h-3 text-red-400'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        );
      default:
        return (
          <svg
            className='w-3 h-3 text-gray-400'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
              clipRule='evenodd'
            />
          </svg>
        );
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-400";
      case "down":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      {/* Top Keywords */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>Top Keywords</CardTitle>
          <CardDescription className='text-gray-400'>
            Most frequently mentioned terms by students this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {keywords.slice(0, 8).map((keyword, index) => (
              <div
                key={keyword.term}
                className='flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors'
              >
                <div className='flex items-center space-x-3'>
                  <div className='flex items-center justify-center w-6 h-6 rounded-full bg-[#19C37D]/20 text-[#19C37D] text-xs font-bold'>
                    {index + 1}
                  </div>
                  <div>
                    <p className='text-white font-medium'>{keyword.term}</p>
                    <p className='text-gray-400 text-xs'>{keyword.category}</p>
                  </div>
                </div>
                <div className='flex items-center space-x-2'>
                  <span className='text-gray-300 font-medium'>
                    {keyword.count}
                  </span>
                  <div className={getTrendColor(keyword.trend)}>
                    {getTrendIcon(keyword.trend)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className='mt-4 pt-4 border-t border-gray-700'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-gray-400'>
                Total unique terms this week
              </span>
              <span className='text-white font-medium'>247</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Student Prompts */}
      <Card className='border-gray-700 bg-[#343541]'>
        <CardHeader>
          <CardTitle className='text-white'>
            Popular Student Questions
          </CardTitle>
          <CardDescription className='text-gray-400'>
            Most frequently asked questions and prompts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {topPrompts.slice(0, 6).map((prompt, index) => (
              <div
                key={prompt.id}
                className='p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors'
              >
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex items-center space-x-2'>
                    <div className='flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold'>
                      {index + 1}
                    </div>
                    <span className='text-blue-400 text-xs font-medium px-2 py-1 bg-blue-500/10 rounded'>
                      {prompt.topic}
                    </span>
                  </div>
                  <div className='text-right'>
                    <p className='text-gray-300 text-xs font-medium'>
                      {prompt.frequency}x
                    </p>
                    <p className='text-gray-500 text-xs'>{prompt.lastAsked}</p>
                  </div>
                </div>
                <p className='text-gray-300 text-sm leading-relaxed'>
                  &ldquo;{prompt.text}&rdquo;
                </p>
              </div>
            ))}
          </div>

          <div className='mt-4 pt-4 border-t border-gray-700'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-400'>Total questions</span>
                <span className='text-white font-medium'>1,247</span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-gray-400'>Avg. response time</span>
                <span className='text-[#19C37D] font-medium'>1.2s</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

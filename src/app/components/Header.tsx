'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-[#9966cc]">DocuHelp AI</Link>
            <div className="ml-2 text-sm text-gray-500">Transform your data processes</div>
          </div>
          
          <div>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Home
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 
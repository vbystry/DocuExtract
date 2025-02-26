'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import BookmarkFlow from '../components/BookmarkFlow';

interface ColumnAnalysis {
  name: string;
  type: string;
  sampleValues: string[];
  uniqueValues: number;
  emptyValues: number;
}

interface CSVAnalysis {
  fileName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnAnalysis[];
}

// Main component with Suspense boundary
export default function EditorPageWrapper() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-[#9966cc]">DocuHelp AI</Link>
              <div className="ml-2 text-sm text-gray-500">Transform your data processes</div>
            </div>
            
            <div>
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content with Suspense */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center">Loading editor...</div>}>
          <EditorContent />
        </Suspense>
      </div>
    </div>
  );
}

// Content component that uses hooks requiring Suspense
function EditorContent() {
  const [sourceAnalysis, setSourceAnalysis] = useState<CSVAnalysis | null>(null);
  const [targetAnalysis, setTargetAnalysis] = useState<CSVAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'source' | 'target'>('source');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sourceParam = searchParams.get('source');
    if (sourceParam) {
      try {
        const decodedSource = JSON.parse(decodeURIComponent(sourceParam));
        setSourceAnalysis(decodedSource);
      } catch (error) {
        console.error('Failed to parse source analysis:', error);
        router.push('/');
      }
    }
  }, [searchParams, router]);

  const handleTargetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to analyze CSV');

      const data = await response.json();
      setTargetAnalysis(data.analysis);
      setActiveTab('target');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze target CSV file');
    }
  };

  if (!sourceAnalysis) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <BookmarkFlow
      sourceAnalysis={sourceAnalysis}
      targetAnalysis={targetAnalysis}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onTargetUpload={handleTargetUpload}
    />
  );
} 
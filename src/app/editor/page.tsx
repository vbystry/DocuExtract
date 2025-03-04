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
  fileType: string;
  datasetId: string;
  fullData?: Record<string, string[]>;
}

interface DocxAnalysis {
  fileName: string;
  content: string;
  fileType: string;
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
  const [sourceAnalysis, setSourceAnalysis] = useState<CSVAnalysis | DocxAnalysis | null>(null);
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

  const handleTargetSchemaCreated = (schema: CSVAnalysis) => {
    setTargetAnalysis(schema);
    setActiveTab('target');
  };

  const handleDownloadDocument = () => {
    if (!sourceAnalysis || sourceAnalysis.fileType !== 'docx') return;
    
    const docx = sourceAnalysis as DocxAnalysis;
    
    // Create a download link for the full text content
    const blob = new Blob([docx.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docx.fileName.split('.')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // After successful file upload, store the full data in localStorage
  useEffect(() => {
    if (sourceAnalysis && 'fullData' in sourceAnalysis) {
      // Store the full CSV data in localStorage
      try {
        localStorage.setItem(
          // @ts-expect-error - sourceAnalysis.analysis.datasetId is a string
          `csvData_${sourceAnalysis.analysis.datasetId}`, 
          JSON.stringify(sourceAnalysis.fullData)
        );
        
        // Remove the fullData from the analysis to keep it light
        delete sourceAnalysis.fullData;
      } catch (error) {
        console.error('Error storing CSV data in localStorage:', error);
      }
    }
  }, [sourceAnalysis]);

  // Add a check for the file type before rendering components
  const renderAnalysisComponent = () => {
    if (!sourceAnalysis) return null;
    
    // Check if the data is from a DOCX file
    if ('fileType' in sourceAnalysis && sourceAnalysis.fileType === 'docx') {
      const docx = sourceAnalysis as DocxAnalysis;
      
      return (
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Document Content</h2>
          <div className="mb-4">
            <p className="font-medium">File: {docx.fileName}</p>
          </div>
          
          <h3 className="text-lg font-semibold mt-6 mb-2">Document Text</h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {docx.content}
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Actions</h3>
            <button
              className="px-4 py-2 bg-[#9966cc] text-white rounded hover:bg-[#8a5bbf]"
              onClick={handleDownloadDocument}
            >
              Download Document
            </button>
          </div>
        </div>
      );
    }
    
    // For CSV files, render the regular BookmarkFlow component
    return (
      <BookmarkFlow
        // @ts-expect-error - sourceAnalysis is a CSVAnalysis or DocxAnalysis
        sourceAnalysis={sourceAnalysis}
        // @ts-expect-error - targetAnalysis is a CSVAnalysis
        targetAnalysis={targetAnalysis}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTargetUpload={handleTargetUpload}
        // @ts-expect-error - handleTargetSchemaCreated is a function that takes a CSVAnalysis
        onTargetSchemaCreated={handleTargetSchemaCreated}
      />
    );
  };

  if (!sourceAnalysis) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Return the appropriate component based on file type
  return renderAnalysisComponent();
} 
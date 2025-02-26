'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import JsonViewer from '../components/JsonViewer';
import Header from '../components/Header';

interface ProcessingResult {
  filename: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  details?: any;
  sourceText?: string;
}

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <Suspense fallback={<div>Loading results...</div>}>
          <ResultsContent />
        </Suspense>
      </main>
    </div>
  );
}

// Create a separate component that uses useSearchParams
function ResultsContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const resultsParam = searchParams.get('results');
    if (resultsParam) {
      try {
        const decodedResults = JSON.parse(decodeURIComponent(resultsParam));
        setResults(decodedResults);
      } catch (error) {
        console.error('Failed to parse results:', error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setLoading(false);
  }, [searchParams, router]);

  if (loading) {
    return <div className="text-center py-8">Loading results...</div>;
  }

  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-700">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentResult = results[0];

  const renderHighlightedContent = (content: string, searchValue: string | null) => {
    if (!searchValue || !content) return content;

    const parts = content.split(new RegExp(`(${searchValue})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchValue?.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 px-1 rounded">{part}</span> : 
        part
    );
  };

  const handleDownloadResults = () => {
    const resultData = {
      filename: currentResult.filename,
      data: currentResult.data,
      sourceText: currentResult.sourceText
    };

    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentResult.filename.replace('.docx', '')}_results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllResults = () => {
    const allResultsData = results.map(result => ({
      filename: result.filename,
      data: result.data,
      sourceText: result.sourceText
    }));

    const blob = new Blob([JSON.stringify(allResultsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">Transformation Results</h1>
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-gray-600">Review and download your extracted document data</p>
        </div>
        <div className="flex gap-2">
          {/* Download All Button */}
          <button
            onClick={handleDownloadAllResults}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All Results
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Upload
          </button>
        </div>
      </div>

      {/* Navigation with Download Current Button */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Upload
            </button>
          </div>

          {/* Download Current Button */}
          {currentResult.success && (
            <button
              onClick={handleDownloadResults}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Current
            </button>
          )}
        </div>
      </div>

      {/* Document Title */}
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-800">{currentResult.filename}</h2>
      </div>

      {/* Split View Container */}
      <div className="flex gap-6">
        {/* Left Side - Extracted Data */}
        <div className="flex-1">
          <div className={`rounded-lg p-6 ${
            currentResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {currentResult.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Successfully Extracted Data</span>
                </div>
                <JsonViewer 
                  data={currentResult.data} 
                  onValueHover={(value) => {
                    // Implementation of onValueHover
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-700 mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Processing Error</span>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-red-600 mb-2">{currentResult.error}</p>
                  {currentResult.details && (
                    <JsonViewer data={currentResult.details} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Document Content */}
        <div className="flex-1">
          <div className="sticky top-6">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-4">
                <h3 className="font-medium text-gray-700">Document Content</h3>
              </div>
              <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                {currentResult.sourceText ? (
                  renderHighlightedContent(currentResult.sourceText, null)
                ) : (
                  <p className="text-gray-500 italic">No content available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
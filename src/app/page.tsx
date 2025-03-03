'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'csv' && fileExtension !== 'docx') {
        setError('Please upload a CSV or DOCX file');
        return;
      }
      
      setFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/analyze-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze CSV');
      }

      const data = await response.json();
      if (!data.success || !data.analysis) {
        throw new Error('Invalid response from server');
      }

      const encodedAnalysis = encodeURIComponent(JSON.stringify(data.analysis));
      router.push(`/editor?source=${encodedAnalysis}`);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              CSV Data Transformation & Mapping
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Upload your CSV files and visually map columns between them. 
              Create powerful data transformations with AI assistance, 
              and export your processed data in just a few clicks.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".csv,.docx"
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg className="w-12 h-12 text-[#9966cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Drop CSV file here or click to select</p>
                </label>
              </div>

              {file && (
                <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-[#9966cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!file || isProcessing}
              className="w-full bg-[#9966cc] text-white rounded-lg py-3 px-4 hover:bg-[#8a5bbf] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Start Transformation'
              )}
            </button>
          </form>

          {/* Features section */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="text-xl font-semibold text-center text-gray-800 mb-6">
              Why Choose DocuHelp AI?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#9966cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-800 mb-1">Visual Editor</h4>
                <p className="text-sm text-gray-600">Intuitive visual interface for transforming your data</p>
              </div>
              
              <div className="p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#9966cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-800 mb-1">Powerful Processing</h4>
                <p className="text-sm text-gray-600">Transform data with automated workflows</p>
              </div>
              
              <div className="p-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#9966cc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-800 mb-1">One-Click Export</h4>
                <p className="text-sm text-gray-600">Get your transformed data instantly</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9966cc]"></div>
              <p className="text-gray-700">
                {file?.name.toLowerCase().endsWith('.docx') 
                  ? 'Analyzing document...' 
                  : 'Analyzing CSV data...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

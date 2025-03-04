'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

interface DocumentSourceProps {
  fileName: string;
  content: string;
  onSelect: () => void;
}

export default function DocumentSource({ fileName, content, onSelect }: DocumentSourceProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Get a preview of the document (first 200 characters)
  const contentPreview = content.length > 200 ? 
    content.substring(0, 200) + '...' : 
    content;
  
  return (
    <div 
      className="w-full border rounded-md mb-2 overflow-hidden bg-blue-50 hover:bg-blue-100 transition-colors"
    >
      <div 
        className="p-3 cursor-pointer"
        onClick={() => onSelect && onSelect()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText size={18} className="text-blue-600" />
            <span className="font-medium text-blue-900">{fileName}</span>
          </div>
          <div className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
            DOCX
          </div>
        </div>
      </div>
      
      <div className="border-t border-blue-200">
        <button
          className="w-full p-2 text-xs flex items-center justify-center text-blue-700 hover:bg-blue-200"
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
        >
          {isPreviewOpen ? (
            <span className="flex items-center">
              <ChevronUp size={14} className="mr-1" />
              Hide Preview
            </span>
          ) : (
            <span className="flex items-center">
              <ChevronDown size={14} className="mr-1" />
              Show Preview
            </span>
          )}
        </button>
        
        {isPreviewOpen && (
          <div className="max-h-[300px] overflow-y-auto">
            <div className="p-3 bg-white border-t border-blue-200 text-sm whitespace-pre-wrap">
              {content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
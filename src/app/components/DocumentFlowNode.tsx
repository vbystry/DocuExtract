'use client';

import { Handle, Position } from 'reactflow';
import { FileText, X } from 'lucide-react';

interface DocumentNodeProps {
  id: string;
  data: {
    name: string;
    type: string;
    isSource: boolean;
    content?: string;
    fileName?: string;
    sampleValues?: string[];
  };
}

export default function DocumentFlowNode({ id, data }: DocumentNodeProps) {
  const isSource = data.isSource;
  
  return (
    <div
      className="border rounded-md shadow-sm min-w-[200px] overflow-hidden"
      style={{ 
        background: '#eff6ff',  // light blue (blue-50) - was purple-100
        borderColor: '#bfdbfe',  // blue-200 - was purple-300
      }}
    >
      {/* Header with Delete Button */}
      <div className="p-2 border-b" style={{ borderColor: '#dbeafe' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-blue-600" />
            <span className="font-medium text-sm text-blue-900 truncate max-w-[120px]">
              {data.fileName || 'Document'}
            </span>
          </div>
          <div className="flex items-center">
            <div 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: '#dbeafe', color: '#1e40af' }}
            >
              DOCX
            </div>
            <button 
              className="ml-1 p-1 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                // This will pass the event up to our custom handler in BookmarkFlow
                const event = new CustomEvent('nodeRemove', { detail: { id } });
                window.dispatchEvent(event);
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-2">
        <div className="text-xs text-blue-800 font-medium mb-1">{data.name}</div>
        {data.sampleValues && data.sampleValues.length > 0 && (
          <div className="text-xs text-gray-600 truncate max-w-[180px]">
            {data.sampleValues[0]}
          </div>
        )}
      </div>
      
      {/* Handle */}
      {isSource ? (
        <Handle
          id="source"
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full"
          style={{ background: '#3b82f6' }}  // blue-500 - was purple-500
        />
      ) : (
        <Handle
          id="target"
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full"
          style={{ background: '#3b82f6' }}  // blue-500 - was purple-500
        />
      )}
    </div>
  );
} 
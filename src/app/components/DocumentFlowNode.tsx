'use client';

import { Handle, Position } from 'reactflow';
import { FileText } from 'lucide-react';

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
        background: '#f3e8ff',  // light purple (purple-100)
        borderColor: '#d8b4fe',  // purple-300
      }}
    >
      {/* Header */}
      <div className="p-2 border-b" style={{ borderColor: '#e9d5ff' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-purple-600" />
            <span className="font-medium text-sm text-purple-900 truncate max-w-[120px]">
              {data.fileName || 'Document'}
            </span>
          </div>
          <div 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#e9d5ff', color: '#7e22ce' }}
          >
            DOCX
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-2">
        <div className="text-xs text-purple-800 font-medium mb-1">{data.name}</div>
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
          style={{ background: '#a855f7' }}  // purple-500
        />
      ) : (
        <Handle
          id="target"
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full"
          style={{ background: '#a855f7' }}  // purple-500
        />
      )}
    </div>
  );
} 
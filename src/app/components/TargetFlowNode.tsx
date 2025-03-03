'use client';

import { Handle, Position } from 'reactflow';
import { Target, X } from 'lucide-react';

interface TargetNodeProps {
  id: string;
  data: {
    name: string;
    type: string;
    isSource: boolean;
    uniqueValues?: number;
    emptyValues?: number;
    sampleValues?: string[];
  };
}

export default function TargetFlowNode({ id, data }: TargetNodeProps) {
  return (
    <div
      className="border rounded-md shadow-sm min-w-[200px] overflow-hidden"
      style={{ 
        background: '#f3e8ff',  // light purple (purple-100) - was blue-50
        borderColor: '#d8b4fe',  // purple-300 - was blue-200
      }}
    >
      {/* Header with Delete Button */}
      <div className="p-2 border-b" style={{ borderColor: '#e9d5ff' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-purple-600" />
            <span className="font-medium text-sm text-purple-900 truncate max-w-[120px]">
              Target Schema
            </span>
          </div>
          <div className="flex items-center">
            <div 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: '#e9d5ff', color: '#7e22ce' }}
            >
              Output
            </div>
            <button 
              className="ml-1 p-1 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => {
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
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-purple-800 font-medium">{data.name}</span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#e9d5ff', color: '#7e22ce' }}
          >
            {data.type}
          </span>
        </div>
        
        {(data.uniqueValues !== undefined && data.emptyValues !== undefined) && (
          <div className="text-xs text-purple-700 mb-1">
            {data.uniqueValues} unique • {data.emptyValues} empty
          </div>
        )}
        
        {data.sampleValues && data.sampleValues.length > 0 && (
          <div className="text-xs text-gray-600 truncate max-w-[180px]">
            {data.sampleValues[0]}
          </div>
        )}
      </div>
      
      {/* Handle */}
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        className="w-3 h-3 rounded-full"
        style={{ background: '#a855f7' }}  // purple-500 - was blue-500
      />
    </div>
  );
} 
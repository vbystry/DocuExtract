'use client';

import { Handle, Position } from 'reactflow';
import { Target } from 'lucide-react';

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
        background: '#eff6ff',  // light blue (blue-50)
        borderColor: '#bfdbfe',  // blue-200
      }}
    >
      {/* Header */}
      <div className="p-2 border-b" style={{ borderColor: '#dbeafe' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target size={14} className="text-blue-600" />
            <span className="font-medium text-sm text-blue-900 truncate max-w-[120px]">
              Target Schema
            </span>
          </div>
          <div 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#dbeafe', color: '#1e40af' }}
          >
            Output
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-blue-800 font-medium">{data.name}</span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#dbeafe', color: '#1e40af' }}
          >
            {data.type}
          </span>
        </div>
        
        {(data.uniqueValues !== undefined && data.emptyValues !== undefined) && (
          <div className="text-xs text-blue-700 mb-1">
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
        style={{ background: '#3b82f6' }}  // blue-500
      />
    </div>
  );
} 
'use client';

import { Handle, Position } from 'reactflow';
import { Table, X } from 'lucide-react';

interface SpreadsheetNodeProps {
  id: string;
  data: {
    name: string;
    type: string;
    isSource: boolean;
    uniqueValues?: number;
    emptyValues?: number;
    sampleValues?: string[];
    fileName?: string;
  };
}

export default function SpreadsheetFlowNode({ id, data }: SpreadsheetNodeProps) {
  const isSource = data.isSource;
  
  return (
    <div
      className="border rounded-md shadow-sm min-w-[200px] overflow-hidden"
      style={{ 
        background: '#ffedd5',  // orange-100
        borderColor: '#fdba74',  // orange-300
      }}
    >
      {/* Header with Delete Button */}
      <div className="p-2 border-b" style={{ borderColor: '#fed7aa' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Table size={14} className="text-orange-600" />
            <span className="font-medium text-sm text-orange-900 truncate max-w-[120px]">
              {data.fileName || 'Spreadsheet'}
            </span>
          </div>
          <div className="flex items-center">
            <div 
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: '#fed7aa', color: '#c2410c' }}
            >
              CSV
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
          <span className="text-xs text-orange-800 font-medium">{data.name}</span>
          <span 
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: '#fed7aa', color: '#c2410c' }}
          >
            {data.type}
          </span>
        </div>
        
        {(data.uniqueValues !== undefined && data.emptyValues !== undefined) && (
          <div className="text-xs text-orange-700 mb-1">
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
      {isSource ? (
        <Handle
          id="source"
          type="source"
          position={Position.Right}
          className="w-3 h-3 rounded-full"
          style={{ background: '#fbbf24' }}  // orange-500
        />
      ) : (
        <Handle
          id="target"
          type="target"
          position={Position.Left}
          className="w-3 h-3 rounded-full"
          style={{ background: '#fbbf24' }}  // orange-500
        />
      )}
    </div>
  );
} 
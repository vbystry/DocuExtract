'use client';

import { Table } from 'lucide-react';

interface ColumnAnalysis {
  name: string;
  type: string;
  sampleValues: string[];
  uniqueValues: number;
  emptyValues: number;
}

interface SpreadsheetSourceProps {
  fileName: string;
  column: ColumnAnalysis;
  onSelect: () => void;
}

export default function SpreadsheetSource({ fileName, column, onSelect }: SpreadsheetSourceProps) {
  return (
    <div 
      className="w-full border rounded-md mb-2 overflow-hidden bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Table size={18} className="text-green-600" />
            <span className="font-medium text-green-900">{fileName}</span>
          </div>
          <div className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
            CSV/Excel
          </div>
        </div>
        
        <div className="border-t border-green-200 pt-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm text-green-900">{column.name}</span>
            <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded">
              {column.type}
            </span>
          </div>
          <div className="mt-1 text-xs text-green-700">
            {column.uniqueValues} unique values • {column.emptyValues} empty values
          </div>
          {column.sampleValues.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 overflow-hidden text-ellipsis">
              <span className="text-xs text-green-600">Sample: </span>
              {column.sampleValues[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
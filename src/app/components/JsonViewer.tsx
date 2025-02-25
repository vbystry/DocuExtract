'use client';

import { JSX } from "react";

interface JsonViewerProps {
  data: any;
  onValueHover?: (value: string) => void;
}

export default function JsonViewer({ data, onValueHover }: JsonViewerProps) {
  const renderValue = (value: any): JSX.Element => {
    if (value === null) return <span className="text-gray-500">null</span>;
    
    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    if (typeof value === 'string') {
      return (
        <span 
          className="text-green-600 cursor-pointer hover:bg-green-50 px-1 rounded"
          onMouseEnter={() => onValueHover?.(value)}
          onMouseLeave={() => onValueHover?.('')}
        >
          "{value}"
        </span>
      );
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span>[]</span>;
      return (
        <div className="pl-4">
          [
          {value.map((item, index) => (
            <div key={index} className="pl-4">
              {renderValue(item)}
              {index < value.length - 1 && ","}
            </div>
          ))}
          ]
        </div>
      );
    }
    if (typeof value === 'object') {
      return renderObject(value);
    }
    return <span>{String(value)}</span>;
  };

  const renderObject = (obj: Record<string, any>): JSX.Element => {
    const entries = Object.entries(obj);
    if (entries.length === 0) return <span>{"{}"}</span>;

    return (
      <div className="pl-4">
        {"{"}
        {entries.map(([key, value], index) => (
          <div key={key} className="pl-4">
            <span className="text-gray-800 font-medium">{key}</span>
            <span className="text-gray-600">: </span>
            {renderValue(value)}
            {index < entries.length - 1 && ","}
          </div>
        ))}
        {"}"}
      </div>
    );
  };

  return (
    <div className="font-mono text-sm bg-white p-4 rounded-lg shadow-sm overflow-x-auto">
      {renderValue(data)}
    </div>
  );
} 
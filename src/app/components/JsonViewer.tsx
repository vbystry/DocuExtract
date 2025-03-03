'use client';

import { JSX } from "react";

interface JsonViewerProps {
  data: any;
  onValueHover?: (value: string) => void;
}

export default function JsonViewer({ data, onValueHover }: JsonViewerProps) {
  // Determine if we're displaying CSV or DOCX analysis
  const fileType = data?.fileType || 'csv';
  
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
          {value}
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
    <div className="json-viewer">
      <h2>Analysis Results</h2>
      
      {fileType === 'csv' && (
        <div className="csv-analysis">
          <div className="summary">
            <p>File: {data.analysis.fileName}</p>
            <p>Rows: {data.analysis.totalRows}</p>
            <p>Columns: {data.analysis.totalColumns}</p>
          </div>
          
          <h3>Column Analysis</h3>
          {data.analysis.columns.map((column, index) => (
            <div key={index} className="column-info">
              <h4>{column.name}</h4>
              <p>Type: {column.type}</p>
              <p>Unique Values: {column.uniqueValues}</p>
              <p>Empty Cells: {column.emptyValues}</p>
              <div className="sample-values">
                <strong>Sample Values:</strong>
                <ul>
                  {column.sampleValues.map((value, i) => (
                    <li key={i}>{value || "<empty>"}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {fileType === 'docx' && (
        <div className="docx-analysis">
          <div className="summary">
            <p>File: {data.analysis.fileName}</p>
            <p>Paragraphs: {data.analysis.totalParagraphs}</p>
            <p>Words: {data.analysis.wordCount}</p>
            <p>Characters: {data.analysis.characterCount}</p>
          </div>
          
          <h3>Document Sample</h3>
          <div className="sample-content">
            {data.analysis.sampleContent.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          
          {data.analysis.parsingWarnings && data.analysis.parsingWarnings.length > 0 && (
            <div className="warnings">
              <h3>Parsing Warnings</h3>
              <ul>
                {data.analysis.parsingWarnings.map((warning, index) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Background,
  Controls,
  Handle,
  Position,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  BaseEdge,
  getSmoothStepPath,
  EdgeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import TargetSchemaModal from './TargetSchemaModal';
import { PlusCircle, Upload, Edit2 } from 'lucide-react';
import SpreadsheetSource from './SpreadsheetSource';
import DocumentSource from './DocumentSource';
import DocumentFlowNode from './DocumentFlowNode';
import SpreadsheetFlowNode from './SpreadsheetFlowNode';
import TargetFlowNode from './TargetFlowNode';

interface ColumnAnalysis {
  name: string;
  type: string;
  sampleValues: string[]; // For UI display
  allValues: string[];    // Full dataset
  uniqueValues: number;
  emptyValues: number;
}

interface CSVAnalysis {
  fileName: string;
  totalRows: number;
  totalColumns: number;
  fileType: string;
  columns: ColumnAnalysis[];
  datasetId?: string;
}

interface DocxAnalysis {
  fileName: string;
  content: string;
  fileType: string;
}

interface BookmarkFlowProps {
  sourceAnalysis: CSVAnalysis | DocxAnalysis;
  targetAnalysis: CSVAnalysis | null;
  activeTab: 'source' | 'target';
  onTabChange: (tab: 'source' | 'target') => void;
  onTargetUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTargetSchemaCreated: (schema: CSVAnalysis) => void;
}

export default function BookmarkFlow({
  sourceAnalysis,
  targetAnalysis,
  activeTab,
  onTabChange,
  onTargetUpload,
  onTargetSchemaCreated,
}: BookmarkFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // Add state for the AI transformation popup
  const [isTransformModalOpen, setIsTransformModalOpen] = useState(false);
  const [transformPrompt, setTransformPrompt] = useState('');
  const [transformingNodeId, setTransformingNodeId] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformResult, setTransformResult] = useState<string | null>(null);

  // First, add a new state to track saved prompts
  const [savedPrompts, setSavedPrompts] = useState<Record<string, string>>({});

  // Add the transform execution handler
  const [transformationResults, setTransformationResults] = useState<Record<string, string>>({});
  const [showResultsModal, setShowResultsModal] = useState(false);

  // First, add new state variables for tracking the final transformation
  const [isFinalTransforming, setIsFinalTransforming] = useState(false);
  const [finalTransformSuccess, setFinalTransformSuccess] = useState<string | null>(null);
  const [finalTransformError, setFinalTransformError] = useState<string | null>(null);

  // First, add a better structure for tracking transformation progress
  const [transformationProgress, setTransformationProgress] = useState({
    total: 0,
    completed: 0,
    current: '',
  });

  // Add a state for the OpenAI API key
  const [openAIKey, setOpenAIKey] = useState<string>('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);

  // Add a validation function for the API key
  const validateApiKey = (key: string) => {
    // Basic validation - OpenAI keys typically start with "sk-" and are longer than 20 chars
    return key.trim().startsWith('sk-') && key.trim().length > 20;
  };

  // Update the DocxAnalysis interface
  interface DocxAnalysis {
    fileName: string;
    content: string;
    fileType: string;
  }

  // Update the adapter function for DocxAnalysis to use full document content
  const adaptDocxToColumnarFormat = (docxData: DocxAnalysis): CSVAnalysis => {
    // Create a single column for the entire document content
    const docxColumns: ColumnAnalysis[] = [
      {
        name: 'Document Content',
        type: 'string',
        // Include the complete document content, not just a preview
        sampleValues: [docxData.content],
        allValues: [docxData.content],
        uniqueValues: 1,
        emptyValues: 0
      }
    ];

    return {
      fileName: docxData.fileName,
      totalRows: 1,
      totalColumns: docxColumns.length,
      columns: docxColumns,
      fileType: 'docx'
    };
  };

  // At the beginning of the component, adapt DOCX data if needed
  const adaptedSourceAnalysis = ('content' in sourceAnalysis) 
    ? adaptDocxToColumnarFormat(sourceAnalysis as DocxAnalysis) 
    : sourceAnalysis as CSVAnalysis;

  const addColumnToEditor = useCallback((column: ColumnAnalysis, isSource: boolean) => {
    const newNode: Node = {
      id: `${isSource ? 'source' : 'target'}-${column.name}-${nodeCount}`,
      type: 'columnNode',
      data: { 
        ...column,
        isSource,
        fileName: isSource 
          ? adaptedSourceAnalysis.fileName 
          : (targetAnalysis?.fileName || 'Target Schema')
      },
      position: { 
        x: isSource ? 100 : 400,  
        y: 100 + (nodeCount * 80)
      },
      draggable: true,
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeCount((count) => count + 1);
  }, [nodeCount, setNodes, adaptedSourceAnalysis.fileName, targetAnalysis?.fileName]);

  // Update the AnimatedSVGEdge component to include both transform and remove buttons
  const AnimatedSVGEdge = ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
  }: EdgeProps) => {
    // Check for prompt in different ways to ensure it works
    const savedPrompt = savedPrompts[target] || '';
    const hasPrompt = !!savedPrompt || (data && data.hasPrompt);
    
    console.log(`Edge ${id}: target=${target}, hasPrompt=${hasPrompt}, savedPrompt=${!!savedPrompt}`);
    
    const [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    // Calculate the midpoint for button positioning
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Function to handle edge removal
    const handleRemoveEdge = (e: React.MouseEvent) => {
      e.stopPropagation();
      console.log('Removing edge:', id);
      
      // Remove the edge
      setEdges(eds => eds.filter(edge => edge.id !== id));
    };
    
    // Function to open the transformation modal
    const handleOpenTransform = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // Get the current prompt from the savedPrompts state
      const currentPrompt = savedPrompts[target] || '';
      
      console.log('Opening transform for edge:', id, 'target:', target, 'current prompt:', currentPrompt);
      
      // First set the transforming node ID
      setTransformingNodeId(target);
      
      // Then set the prompt value
      setTransformPrompt(currentPrompt);
      
      // Clear any previous result message
      setTransformResult(null);
      
      // Open the modal
      setIsTransformModalOpen(true);
    };

    return (
      <>
        {/* Base edge path */}
        <BaseEdge id={id} path={edgePath} style={{ 
          stroke: '#3b82f6',
          strokeWidth: 2,
          strokeDasharray: '5,5'
        }} />
        
        {/* Animated circle */}
        <circle r="6">
          <animateMotion 
            dur="4s" 
            repeatCount="indefinite" 
            path={edgePath} 
          />
          <animate 
            attributeName="fill" 
            values="#3b82f6;#3b82f6;#9966cc;#9966cc" 
            keyTimes="0;0.3;0.7;1"
            dur="4s" 
            repeatCount="indefinite" 
          />
        </circle>

        {/* Edge controls with both buttons */}
        <foreignObject
          width={130}
          height={24}
          x={midX - 65}
          y={midY - 12}
          requiredExtensions="http://www.w3.org/1999/xhtml"
          style={{ overflow: 'visible' }}
        >
          <div 
            style={{
              display: 'flex',
              gap: '4px',
              justifyContent: 'center',
            }}
          >
            {/* Transform button */}
            <div 
              style={{
                background: hasPrompt ? '#f0f9ff' : 'white',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                color: '#0284c7',
                border: '1px solid #e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                width: '60px'
              }}
              onMouseDown={e => e.stopPropagation()}
              onClick={handleOpenTransform}
            >
              {hasPrompt ? 'Edit AI' : 'Add AI'}
            </div>
            
            {/* Remove button */}
            <div 
              style={{
                background: 'white',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                width: '50px'
              }}
              onMouseDown={e => e.stopPropagation()}
              onClick={handleRemoveEdge}
            >
              Remove
            </div>
          </div>
        </foreignObject>
      </>
    );
  };

  // Define the node component (but don't create the nodeTypes object yet)
  function ColumnNode({ id, data }: { id: string; data: any }) {
    // Determine which component to render based on the data
    if (!data.isSource) {
      // Target nodes always use the blue target component
      return <TargetFlowNode id={id} data={data} />;
    }
    
    // For source nodes, check if it's a document or spreadsheet
    if (data.name === 'Document Content') {
      return <DocumentFlowNode id={id} data={data} />;
    } else {
      return <SpreadsheetFlowNode id={id} data={data} />;
    }
  }

  // Now memoize the nodeTypes and edgeTypes objects
  const nodeTypes = useMemo(() => ({
    columnNode: ColumnNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    transform: AnimatedSVGEdge,
  }), []);

  // Connect edges
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'transform',
        style: { 
          stroke: '#3b82f6', 
          strokeWidth: 2,
          strokeDasharray: '5,5',
        }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Render column button
  const renderColumnButton = useCallback((column: ColumnAnalysis, index: number) => {
    const isSource = activeTab === 'source';
    
    if (isSource) {
      // Check if this is from a DOCX file (we can detect this by checking for a specific column name)
      const isDocx = adaptedSourceAnalysis.columns.length === 1 && 
                    adaptedSourceAnalysis.columns[0].name === 'Document Content';
      
      if (isDocx) {
        // Get the original source data
        const docxSource = sourceAnalysis as DocxAnalysis;
        
        return (
          <DocumentSource
            key={column.name}
            fileName={docxSource.fileName}
            content={docxSource.content}
            onSelect={() => addColumnToEditor(column, true)}
          />
        );
      } else {
        // This is a CSV/Excel source
        return (
          <SpreadsheetSource
            key={column.name}
            fileName={adaptedSourceAnalysis.fileName}
            column={column}
            onSelect={() => addColumnToEditor(column, true)}
          />
        );
      }
    } else {
      // For target columns, we'll keep the current button style
      // but we'll enhance it with the visual indicator for connections
      const nodeIdentifier = `target-${column.name}-${index}`;
      const isConnected = edges.some(edge => edge.target === nodeIdentifier);
      
      return (
        <div 
          key={column.name} 
          className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${isConnected ? 'bg-blue-50' : ''}`}
          onClick={() => addColumnToEditor(column, false)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-gray-800">{column.name}</span>
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
              {column.type}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {isConnected ? (
              <span className="text-blue-600">Connected</span>
            ) : (
              `${column.uniqueValues} unique • ${column.emptyValues} empty`
            )}
          </div>
        </div>
      );
    }
  }, [addColumnToEditor, activeTab, edges, adaptedSourceAnalysis, sourceAnalysis]);

  // Add a function to close the transform modal
  const closeTransformModal = () => {
    setIsTransformModalOpen(false);
    setTransformingNodeId(null);
    setTransformPrompt('');
    setTransformResult(null);
  };

  // Update the handleClearPrompt function to ensure it properly removes the prompt
  const handleClearPrompt = () => {
    if (!transformingNodeId) {
      console.error('No node ID selected for clearing prompt');
      return;
    }
    
    console.log('Clearing prompt for node:', transformingNodeId);
    
    // Remove the prompt for this node with a direct state update
    setSavedPrompts(prev => {
      console.log('Previous saved prompts:', prev);
      const newPrompts = { ...prev };
      delete newPrompts[transformingNodeId];
      console.log('New saved prompts after clearing:', newPrompts);
      return newPrompts;
    });
    
    // Reset all state related to the transform
    setTransformPrompt('');
    setTransformResult(null);
    
    // Force the edge UI to update immediately
    setEdges(prevEdges => {
      return prevEdges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          hasPrompt: edge.target === transformingNodeId ? false : !!savedPrompts[edge.target],
          promptTimestamp: Date.now()
        }
      }));
    });
    
    // Close the modal
    closeTransformModal();
  };

  // Also update the handleSavePrompt function to close the modal faster
  const handleSavePrompt = () => {
    if (!transformingNodeId) {
      console.error('No transforming node ID set');
      return;
    }
    
    // Validate the prompt
    if (!transformPrompt.trim()) {
      setTransformResult('Transformation prompt cannot be empty');
      return;
    }
    
    console.log('Saving prompt for node:', transformingNodeId, transformPrompt);
    
    // Update the savedPrompts state
    setSavedPrompts(prev => {
      const newPrompts = { ...prev };
      newPrompts[transformingNodeId] = transformPrompt.trim();
      return newPrompts;
    });
    
    // Show success message and close modal after a brief delay
    setTransformResult('Prompt saved successfully!');
    
    // Close modal quickly after saving
    setTimeout(() => {
      closeTransformModal();
    }, 500);
  };

  // Update the handleExecuteTransformations function for better state management
  const handleExecuteTransformations = async () => {
    if (edges.length === 0) return;
    
    // Reset any previous transformation results
    setTransformationResults({});
    setFinalTransformSuccess(null);
    setFinalTransformError(null);
    
    setIsTransforming(true);
    
    try {
      // Create a collection of all transformations to execute
      const transformationsToExecute = edges.map(edge => {
        const targetNode = nodes.find(node => node.id === edge.target);
        const sourceNode = nodes.find(node => node.id === edge.source);
        const prompt = savedPrompts[edge.target] || ''; // Get the saved prompt for this target node
        
        return {
          edgeId: edge.id,
          sourceId: edge.source,
          targetId: edge.target,
          sourceName: sourceNode?.data?.name || '',
          targetName: targetNode?.data?.name || '',
          prompt: prompt,
        };
      });
      
      console.log('Executing transformations:', transformationsToExecute);
      
      // For now, let's simulate async processing
      // In a real implementation, this would be an API call
      const results: Record<string, string> = {};
      
      for (const transform of transformationsToExecute) {
        // Simulate API call for each transformation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        results[transform.edgeId] = `Transformed data from ${transform.sourceName} to ${transform.targetName}${
          transform.prompt ? ` using prompt: "${transform.prompt}"` : ' just copy paste values'
        }`;
      }
      
      // Store the results
      setTransformationResults(results);
      
      // Show results modal with a fresh state
      setShowResultsModal(true);
      
    } catch (error) {
      console.error('Error executing transformations:', error);
      alert('An error occurred while executing transformations');
    } finally {
      setIsTransforming(false);
    }
  };


  // Update the final transform function to retrieve full values from localStorage
  const handleFinalTransform = async () => {
    // Reset success/error states when starting a new transformation
    setFinalTransformSuccess(null);
    setFinalTransformError(null);
    
    // Check if we need an API key (if any transformation uses a prompt)
    const needsApiKey = edges.some(edge => {
      const targetNodeId = edge.target;
      return !!savedPrompts[targetNodeId];
    });
    
    // Validate API key if needed and provided
    if (needsApiKey && openAIKey) {
      const isValid = validateApiKey(openAIKey);
      setIsApiKeyValid(isValid);
      
      if (!isValid) {
        setFinalTransformError('Valid OpenAI API key required for AI transformations');
        return;
      }
    }
    
    setIsFinalTransforming(true);
    
    try {
      // 1. Get source data (assuming we have access to it)
      // In a real app, you might need to fetch this from state or storage
      const sourceData = adaptedSourceAnalysis;
      
      // 2. Prepare transformation plan
      const transformations = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        return {
          edgeId: edge.id,
          source: {
            id: edge.source,
            name: sourceNode?.data?.name,
            columnIndex: sourceData.columns.findIndex(c => c.name === sourceNode?.data?.name),
          },
          target: {
            id: edge.target,
            name: targetNode?.data?.name,
            columnIndex: targetAnalysis?.columns.findIndex(c => c.name === targetNode?.data?.name) ?? -1,
          },
          prompt: savedPrompts[edge.target] || null,
        };
      });
      
      // 3. Set up progress tracking
      setTransformationProgress({
        total: transformations.length,
        completed: 0,
        current: transformations[0]?.source.name || '',
      });
      
      // 4. Process each transformation
      const transformedColumns = {};
      const targetColumns = [];
      
      for (const transform of transformations) {
        // Update progress
        setTransformationProgress(prev => ({
          ...prev,
          current: `${transform.source.name} → ${transform.target.name}`,
        }));
        
        // Get source column data
        const sourceColumnIndex = transform.source.columnIndex;
        const sourceColumnName = transform.source.name;
        
        if (sourceColumnIndex === -1 || !sourceColumnName) {
          throw new Error(`Source column not found: ${transform.source.name}`);
        }
        
        // Get source values - first try to get from localStorage
        let sourceValues : string[] = [];
        
        if (sourceData.datasetId) {
          try {
            const storedData = localStorage.getItem(`csvData_${sourceData.datasetId}`);
            if (storedData) {
              const parsedData = JSON.parse(storedData);
              sourceValues = parsedData[sourceColumnName] || [];
            }
          } catch (error) {
            console.error('Error retrieving data from localStorage:', error);
          }
        }
        
        // Fall back to sample values if localStorage data is not available
        if (!sourceValues.length) {
          sourceValues = sourceData.columns[sourceColumnIndex].sampleValues;
        }
        
        // Apply transformation - either AI or direct copy
        let transformedValues : string[] = [];
        
        try {
          const response = await fetch('/api/transform-dataset', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              datasetId: sourceData.datasetId,
              columnName: sourceData.columns[sourceColumnIndex].name,
              prompt: transform.prompt || '', // Empty string for direct copy
              apiKey: transform.prompt ? openAIKey : '' // Only send API key if using AI
            }),
          });
          
          if (!response.ok) {
            throw new Error('Transformation failed');
          }
          
          const data = await response.json();
          transformedValues = data.transformedValues;
        } catch (error) {
          console.error('Server transformation error:', error);
          // Fallback to sample values
          transformedValues = transform.prompt
            ? await processWithAI(sourceData.columns[sourceColumnIndex].sampleValues, transform.prompt, openAIKey)
            : [...sourceData.columns[sourceColumnIndex].sampleValues];
        }
        
        // Store transformed column
        transformedColumns[transform.target.name] = transformedValues;
        // @ts-expect-error - targetColumns is an array of strings
        targetColumns.push(transform.target.name);
        
        // Update progress
        setTransformationProgress(prev => ({
          ...prev,
          completed: prev.completed + 1,
        }));
      }
      
      // 5. Prepare final CSV data
      const csvRows = [];
      
      // Add header row
      // @ts-expect-error - targetColumns is an array of strings
      csvRows.push(targetColumns.join(','));
      
      // Add data rows (using the length of the first transformed column)
      // @ts-expect-error - targetColumns is an array of strings
      const rowCount = transformedColumns[targetColumns[0]]?.length || 0;
      
      for (let i = 0; i < rowCount; i++) {
        const rowValues = targetColumns.map(colName => {
          // Get value, escape commas and quotes
          const value = transformedColumns[colName][i] || '';
          // @ts-expect-error - targetColumns is an array of strings
          return `"${value.replace(/"/g, '""')}"`;
        });
        
        // @ts-expect-error - targetColumns is an array of strings
          csvRows.push(rowValues.join(','));
      }
      
      // 6. Store the final CSV for download
      const csvContent = csvRows.join('\r\n');
      
      // 7. Set success state with the data
      setFinalTransformSuccess('Transformation completed! Your data is ready.');
      
      // 8. Store the CSV data for download
      const downloadUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      // @ts-expect-error - transformedCsvData is a global variable
      window.transformedCsvData = downloadUrl;
      
      // 9. Automatically trigger download
      const link = document.createElement("a");
      link.setAttribute("href", downloadUrl);
      link.setAttribute("download", "transformed_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error during transformation:', error);
      // @ts-expect-error - error is an object
      setFinalTransformError(`Transformation failed: ${error.message}`);
    } finally {
      setIsFinalTransforming(false);
    }
  };

  // Update the processWithAI function to use the API key if provided
  const processWithAI = async (values, prompt, apiKey = '') => {
    const transformed = [];
    
    // Process in small batches to avoid rate limits
    const batchSize = 5;
    
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const batchPromises = batch.map(async (value) => {
        try {
          // If API key is provided and valid, use OpenAI API
          if (apiKey && validateApiKey(apiKey)) {
            try {
              const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: 'gpt-3.5-turbo',
                  messages: [
                    { 
                      role: 'system', 
                      content: 'You are a data transformation assistant. Transform the input value according to the instructions. Return only the transformed value without explanation.' 
                    },
                    { 
                      role: 'user', 
                      content: `Transform this value: "${value}" according to these instructions: "${prompt}"` 
                    }
                  ],
                  temperature: 0.3,
                  max_tokens: 100
                })
              });
              
              if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
              }
              
              const data = await response.json();
              return data.choices[0].message.content.trim();
            } catch (error) {
              console.error('OpenAI API error:', error);
              return `${value} (API error)`;
            }
          }
          
          // Fallback to simulation if no valid API key
          // In a real app, this would call your API endpoint
          // For demo, simulate AI processing with a timeout
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Process the value based on the prompt
          // Simple simulation:
          if (prompt.includes('calculate') || prompt.includes('compute')) {
            // If prompt contains math-related words, try to do basic math
            if (prompt.includes('*2')) {
              return (parseFloat(value) * 2).toString();
            } else if (prompt.includes('+ 10')) {
              return (parseFloat(value) + 10).toString();
            }
          } else if (prompt.includes('uppercase') || prompt.includes('UPPER')) {
            return value.toUpperCase();
          } else if (prompt.includes('lowercase')) {
            return value.toLowerCase();
          }
          
          // Default transformation adds a note
          return `${value} (transformed with AI)`;
        } catch (err) {
          console.error('Error processing value with AI:', err);
          return `${value} (error)`;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      // @ts-expect-error - transformed is an array of strings
      transformed.push(...batchResults);
    }
    
    return transformed;
  };

  // Finally, add a reset function for when the modal is closed
  const closeResultsModal = () => {
    setShowResultsModal(false);
    // Don't clear all state so download can still work after closing
  };

  // Update the target schema modal state
  const [targetSchemaModalConfig, setTargetSchemaModalConfig] = useState({
    isOpen: false,
    mode: 'create' as 'create' | 'edit',
    initialColumns: [{ name: '', type: 'string' }]
  });

  // Add a function to open the modal in edit mode
  const openEditTargetSchema = () => {
    if (!targetAnalysis) return;
    
    // Convert the current target analysis to the column definition format
    const columns = targetAnalysis.columns.map(col => ({
      name: col.name,
      type: col.type
    }));
    
    setTargetSchemaModalConfig({
      isOpen: true,
      mode: 'edit',
      initialColumns: columns
    });
  };

  // Update the function to open the modal in create mode
  const openCreateTargetSchema = () => {
    setTargetSchemaModalConfig({
      isOpen: true,
      mode: 'create',
      initialColumns: [{ name: '', type: 'string' }]
    });
  };

  // Close modal function
  const closeTargetSchemaModal = () => {
    setTargetSchemaModalConfig(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Update the function to handle both creating and editing
  const handleCreateTargetSchema = (columns) => {
    // Convert the column definitions to the CSVAnalysis format
    const targetAnalysisData: CSVAnalysis = {
      fileName: targetAnalysis ? targetAnalysis.fileName : 'custom-schema.csv',
      totalRows: targetAnalysis ? targetAnalysis.totalRows : 0,
      totalColumns: columns.length,
      fileType: 'csv',
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        sampleValues: targetAnalysis ? 
          // Try to preserve existing sample values for columns that still exist
          targetAnalysis.columns.find(c => c.name === col.name)?.sampleValues || [] : 
          [],
        allValues: targetAnalysis ? 
          targetAnalysis.columns.find(c => c.name === col.name)?.allValues || [] :
          [],
        uniqueValues: targetAnalysis ? 
          targetAnalysis.columns.find(c => c.name === col.name)?.uniqueValues || 0 :
          0,
        emptyValues: targetAnalysis ? 
          targetAnalysis.columns.find(c => c.name === col.name)?.emptyValues || 0 :
          0
      }))
    };
    
    // Update the target analysis with our created/edited schema
    onTargetSchemaCreated(targetAnalysisData);
  };

  // Add a handler for node removal
  useEffect(() => {
    const handleNodeRemove = (event: CustomEvent) => {
      const nodeId = event.detail.id;
      console.log('Removing node:', nodeId);
      
      // Remove the node
      setNodes(nodes => nodes.filter(node => node.id !== nodeId));
      
      // Remove any connected edges
      setEdges(edges => edges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ));
      
      // Clean up any saved prompts for edges connected to this node
      setSavedPrompts(prev => {
        const newPrompts = { ...prev };
        
        // If this was a target node, remove its prompt
        if (nodeId in newPrompts) {
          delete newPrompts[nodeId];
        }
        
        return newPrompts;
      });
    };
    
    // Add event listener
    window.addEventListener('nodeRemove', handleNodeRemove as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('nodeRemove', handleNodeRemove as EventListener);
    };
  }, [setNodes, setEdges]);

  // Add a function to update edges after prompt changes
  const updateEdgesWithPromptState = useCallback(() => {
    setEdges(prevEdges => {
      return prevEdges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          hasPrompt: !!savedPrompts[edge.target],
          promptTimestamp: Date.now()
        }
      }));
    });
  }, [savedPrompts, setEdges]);

  // Call this function after any prompt changes
  useEffect(() => {
    console.log('Saved prompts updated:', savedPrompts);
    updateEdgesWithPromptState();
  }, [savedPrompts, updateEdgesWithPromptState]);

  // Add a useEffect hook to ensure the prompt is loaded when the modal opens
  useEffect(() => {
    if (isTransformModalOpen && transformingNodeId) {
      const savedPrompt = savedPrompts[transformingNodeId] || '';
      console.log('Modal opened, setting prompt to:', savedPrompt);
      setTransformPrompt(savedPrompt);
    }
  }, [isTransformModalOpen, transformingNodeId, savedPrompts]);

  return (
    <div className="flex h-full w-full">
      {/* Left Panel - Bookmarks */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'source' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => onTabChange('source')}
          >
            Source
          </button>
          <div className="flex items-center">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${
                activeTab === 'target' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => onTabChange('target')}
            >
              Target
              {!targetAnalysis && (
                <span className="ml-2 text-xs text-gray-400">(Not set)</span>
              )}
            </button>
            
            {/* Add Edit button next to target tab when there's a target schema */}
            {targetAnalysis && (
              <button
                onClick={openEditTargetSchema}
                className="ml-1 p-1 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                title="Edit Target Schema"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Column Buttons */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'source' 
            ? adaptedSourceAnalysis.columns.map(renderColumnButton)
            : targetAnalysis 
              ? (
                <>
                  <div className="flex items-center justify-between p-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-700">
                      {targetAnalysis.columns.length} column{targetAnalysis.columns.length !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={openEditTargetSchema}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 size={14} className="mr-1" />
                      Edit Schema
                    </button>
                  </div>
                  {targetAnalysis.columns.map(renderColumnButton)}
                </>
              )
              : (
                <div className="p-4 flex flex-col items-center gap-4">
                  <div className="text-center text-sm text-gray-600 mb-2">
                    Create your target schema:
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={openCreateTargetSchema}
                      className="flex items-center justify-center gap-2 px-4 py-3 w-full border border-[#9966cc] rounded-md text-sm font-medium text-[#9966cc] bg-white hover:bg-purple-50"
                    >
                      <PlusCircle size={16} />
                      Create Schema Manually
                    </button>
                    
                    <div className="text-center text-sm text-gray-500">or</div>
                    
                    <label 
                      htmlFor="target-upload"
                      className="flex items-center justify-center gap-2 px-4 py-3 w-full border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <Upload size={16} />
                      Upload CSV File
                    </label>
                    <input
                      type="file"
                      onChange={onTargetUpload}
                      accept=".csv"
                      className="hidden"
                      id="target-upload"
                    />
                  </div>
                </div>
              )}
        </div>
        
        {/* Transform Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleExecuteTransformations}
            disabled={edges.length === 0}
            className={`w-full py-3 px-4 rounded-md font-medium text-white text-sm ${
              edges.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#9966cc] hover:bg-[#8a5bbf] shadow-sm'
            }`}
          >
            {edges.length === 0 ? 'Connect nodes to transform' : 'Transform'}
          </button>
          {edges.length > 0 && (
            <div className="text-xs text-gray-500 text-center mt-2">
              {edges.length} connection{edges.length !== 1 ? 's' : ''} ready
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Flow Editor */}
      <div className="flex-1 h-full">
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            onInit={setReactFlowInstance}
            style={{ background: '#f9fafb' }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {/* AI Transform Modal */}
      {isTransformModalOpen && transformingNodeId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              AI Transformation
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Enter a prompt for the AI to transform the source data into the target format.
              {savedPrompts[transformingNodeId] && (
                <span className="font-medium ml-1">
                  (Editing existing prompt)
                </span>
              )}
            </p>
            
            <div className="mb-4">
              <textarea
                value={transformPrompt}
                onChange={(e) => setTransformPrompt(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md h-32 text-sm"
                placeholder="Example: Extract the first name from the full name"
              />
            </div>
            
            {transformResult && (
              <div className="mb-4 p-2 text-sm border rounded-md bg-blue-50 text-blue-800 flex items-center justify-between">
                <span>{transformResult}</span>
                {transformResult === 'Prompt saved successfully!' && (
                  <span className="text-xs text-blue-600">
                    You can continue editing or press Done when finished
                  </span>
                )}
              </div>
            )}
            
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-3 sm:gap-3">
              <button
                type="button"
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 col-span-1"
                onClick={closeTransformModal}
              >
                {transformResult === 'Prompt saved successfully!' ? 'Done' : 'Cancel'}
              </button>
              
              {/* Show Clear button when editing an existing prompt */}
              {savedPrompts[transformingNodeId] && (
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-red-700 hover:bg-red-50 col-span-1"
                  onClick={handleClearPrompt}
                >
                  Clear
                </button>
              )}
              
              <button
                type="button"
                className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 ${savedPrompts[transformingNodeId] ? 'col-span-1' : 'col-span-2'}`}
                style={{ 
                  backgroundColor: '#3b82f6'
                }}
                onClick={handleSavePrompt}
                disabled={isTransforming}
              >
                {isTransforming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transformation Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">Transformation Plan</h3>
              <button 
                onClick={closeResultsModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {/* OpenAI API Key input */}
              {edges.some(edge => !!savedPrompts[edge.target]) && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key (Optional)
                  </h4>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      Your transformations contain AI prompts. For improved results, provide your OpenAI API key.
                    </p>
                    <div className="relative">
                      <input
                        type="password"
                        value={openAIKey}
                        onChange={(e) => {
                          setOpenAIKey(e.target.value);
                          setIsApiKeyValid(null);
                        }}
                        className={`w-full px-3 py-2 border ${
                          isApiKeyValid === false
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-blue-500'
                        } rounded-md shadow-sm focus:outline-none focus:ring-2`}
                        placeholder="sk-..."
                      />
                      {isApiKeyValid === false && (
                        <div className="text-xs text-red-600 mt-1">
                          Please enter a valid OpenAI API key
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Your API key is only used for this transformation and not stored. Without a key, simulated transformations will be used.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4 pb-4 border-b border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Here's what will happen:</h4>
                <p className="text-sm text-gray-600">We'll apply all the transformations you've defined, connecting your source data to target columns.</p>
              </div>
              
              {Object.keys(transformationResults).length === 0 ? (
                <div className="text-gray-500 text-center py-4">No transformation results available</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(transformationResults).map(([edgeId, result]) => {
                    const edge = edges.find(e => e.id === edgeId);
                    const sourceNode = nodes.find(n => n.id === edge?.source);
                    const targetNode = nodes.find(n => n.id === edge?.target);
                    
                    return (
                      <div key={edgeId} className="border rounded-md p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{sourceNode?.data?.name || 'Source'}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium text-sm">{targetNode?.data?.name || 'Target'}</span>
                        </div>
                        <div className="text-sm text-gray-600">{result}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Show status messages */}
              {finalTransformSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-md text-green-700 text-sm">
                  {finalTransformSuccess}
                </div>
              )}
              
              {finalTransformError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-700 text-sm">
                  {finalTransformError}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex flex-col gap-3">
              {/* Single TRANSFORM! button */}
              <button
                onClick={handleFinalTransform}
                disabled={isFinalTransforming}
                className={`w-full py-3 px-4 rounded-md font-medium text-white text-sm ${
                  isFinalTransforming
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#9966cc] hover:bg-[#8a5bbf] shadow-md transition-colors'
                }`}
              >
                {isFinalTransforming ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "TRANSFORM!"
                )}
              </button>
              
              <button
                onClick={closeResultsModal}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-800 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transformation Progress */}
      {isFinalTransforming && (
        <div className="mt-4 border border-blue-100 rounded-md bg-blue-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              Transforming data...
            </span>
            <span className="text-xs text-blue-600">
              {transformationProgress.completed} of {transformationProgress.total}
            </span>
          </div>
          
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${transformationProgress.total === 0 ? 0 : 
                  (transformationProgress.completed / transformationProgress.total) * 100}%` 
              }}
            ></div>
          </div>
          
          <div className="mt-2 text-xs text-blue-600">
            Currently processing: {transformationProgress.current}
          </div>
        </div>
      )}

      {/* Target Schema Modal */}
      <TargetSchemaModal
        isOpen={targetSchemaModalConfig.isOpen}
        onClose={closeTargetSchemaModal}
        onSave={handleCreateTargetSchema}
        mode={targetSchemaModalConfig.mode}
        initialColumns={targetSchemaModalConfig.initialColumns}
      />
    </div>
  );
} 
'use client';

import { useState, useCallback, useMemo } from 'react';
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

interface ColumnAnalysis {
  name: string;
  type: string;
  sampleValues: string[];
  uniqueValues: number;
  emptyValues: number;
}

interface CSVAnalysis {
  fileName: string;
  totalRows: number;
  totalColumns: number;
  columns: ColumnAnalysis[];
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
}

export default function BookmarkFlow({
  sourceAnalysis,
  targetAnalysis,
  activeTab,
  onTabChange,
  onTargetUpload,
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

  // Update the adapter function for DocxAnalysis
  const adaptDocxToColumnarFormat = (docxData: DocxAnalysis): CSVAnalysis => {
    // Create a single column for the entire document content
    const docxColumns: ColumnAnalysis[] = [
      {
        name: 'Document Content',
        type: 'string',
        // Just use the first 100 characters as a preview
        sampleValues: [docxData.content.substring(0, 100) + (docxData.content.length > 100 ? '...' : '')],
        uniqueValues: 1,
        emptyValues: 0
      }
    ];

    return {
      fileName: docxData.fileName,
      totalRows: 1,
      totalColumns: docxColumns.length,
      columns: docxColumns
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
      },
      position: { 
        x: isSource ? 100 : 400,  
        y: 100 + (nodeCount * 80)
      },
      draggable: true,
    };

    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      console.log('Updated nodes:', updatedNodes);
      return updatedNodes;
    });
    setNodeCount((count) => count + 1);
  }, [nodeCount, setNodes]);

  // Simple edge component with animation
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
  }: EdgeProps) => {
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

        {/* Remove button */}
        <foreignObject
          width={60}
          height={24}
          x={midX - 30}
          y={midY - 12}
          requiredExtensions="http://www.w3.org/1999/xhtml"
          style={{ overflow: 'visible' }}
        >
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
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            onMouseDown={e => e.stopPropagation()}
            onClick={handleRemoveEdge}
          >
            Remove
          </div>
        </foreignObject>
      </>
    );
  };

  // Define the node component (but don't create the nodeTypes object yet)
  const ColumnNodeComponent = useCallback(({ data, id }: { data: ColumnAnalysis & { isSource: boolean }, id: string }) => {
    const connectedNodesCount = edges.filter(edge => 
      (data.isSource && edge.source === id) || (!data.isSource && edge.target === id)
    ).length;
    
    // Function to handle node removal with improved debugging
    const handleRemoveNode = () => {
      console.log('Removing node with ID:', id);
      
      // First get all connected edges for logging
      const connectedEdges = edges.filter(edge => 
        edge.source === id || edge.target === id
      );
      console.log('Connected edges to remove:', connectedEdges);
      
      // Remove all connected edges first
      setEdges(prevEdges => {
        const newEdges = prevEdges.filter(edge => 
          edge.source !== id && edge.target !== id
        );
        console.log('Edges after filtering:', newEdges);
        return newEdges;
      });
      
      // Then remove the node
      setNodes(prevNodes => {
        const newNodes = prevNodes.filter(node => node.id !== id);
        console.log('Nodes after filtering:', newNodes);
        return newNodes;
      });
    };
    
    // Function to handle AI transformation
    const handleTransformNode = () => {
      console.log('Opening transform modal for node:', id);
      setTransformingNodeId(id);
      
      // Check if there's already a saved prompt for this node
      if (savedPrompts[id]) {
        // If editing an existing prompt, populate the textarea with the saved prompt
        setTransformPrompt(savedPrompts[id]);
      } else {
        // Otherwise start with an empty prompt
        setTransformPrompt('');
      }
      
      setTransformResult(null); // Reset any previous results
      setIsTransformModalOpen(true);
    };
    
    // Check if this node has a saved prompt
    const hasPrompt = !!savedPrompts[id];
    
    return (
      <div className="px-4 py-2 shadow-md rounded-md bg-white border border-gray-200 min-w-[180px]">
        <Handle 
          type={data.isSource ? "source" : "target"} 
          position={data.isSource ? Position.Right : Position.Left} 
          style={{ background: '#3b82f6' }}
        />
        
        <div className="flex flex-col">
          <div className="font-medium text-sm text-gray-800">{data.name}</div>
          <div className="text-xs text-gray-500">{data.type}</div>
          <div className="text-xs text-gray-400 mt-1">
            {data.uniqueValues} unique • {data.emptyValues} empty
          </div>
          
          {connectedNodesCount > 0 && (
            <div className="mt-2 border-t pt-2 border-gray-100">
              <div className="text-xs text-gray-600">
                {connectedNodesCount} connection{connectedNodesCount > 1 ? 's' : ''}
              </div>
            </div>
          )}
          
          {/* Show action buttons for all nodes */}
          <div 
            className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1"
            onClick={e => e.stopPropagation()}
          >
            {/* For target nodes, show transformation buttons */}
            {!data.isSource && (
              <div 
                className={`text-xs py-1 px-2 rounded transition-colors cursor-pointer ${
                  hasPrompt 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-[#9966cc] text-white hover:bg-[#8a5bbf]'
                }`}
                onMouseDown={e => e.stopPropagation()} 
                onClick={e => {
                  e.stopPropagation();
                  handleTransformNode();
                }}
              >
                {hasPrompt ? 'Edit Transformation' : 'Transform with AI'}
              </div>
            )}
            
            {/* Remove button for all nodes */}
            <div 
              className="text-xs py-1 px-2 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors cursor-pointer"
              onMouseDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                handleRemoveNode();
              }}
            >
              Remove
            </div>
          </div>
        </div>
      </div>
    );
  }, [edges, setEdges, setNodes, setTransformingNodeId, setIsTransformModalOpen, setTransformPrompt, savedPrompts]);

  // Now memoize the nodeTypes and edgeTypes objects
  const nodeTypes = useMemo(() => ({
    columnNode: ColumnNodeComponent,
  }), [ColumnNodeComponent]);

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

  // Render column button in the bookmark panel
  const renderColumnButton = (column: ColumnAnalysis) => (
    <button
      key={column.name}
      onClick={() => addColumnToEditor(column, activeTab === 'source')}
      className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-gray-800">{column.name}</span>
        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
          {column.type}
        </span>
      </div>
      <div className="text-xs text-gray-500">
        {column.uniqueValues} unique • {column.emptyValues} empty
      </div>
    </button>
  );

  // Update the handleSavePrompt function to prevent saving empty prompts
  const handleSavePrompt = () => {
    if (!transformingNodeId || !transformPrompt.trim()) {
      // Show an error message if trying to save an empty prompt
      setTransformResult('Transformation prompt cannot be empty');
      return;
    }
    
    console.log('Saving prompt for node:', transformingNodeId);
    
    // Save the prompt for this node
    setSavedPrompts(prev => ({
      ...prev,
      [transformingNodeId]: transformPrompt.trim()
    }));
    
    // Show a brief success message
    setTransformResult('Prompt saved successfully!');
    
    // Optionally close the modal after a delay
    setTimeout(() => {
      closeTransformModal();
    }, 1500);
  };

  // Also add handling for the case where a user tries to clear a prompt
  const handleClearPrompt = () => {
    if (!transformingNodeId) return;
    
    // Remove the prompt for this node
    setSavedPrompts(prev => {
      const newPrompts = { ...prev };
      delete newPrompts[transformingNodeId];
      return newPrompts;
    });
    
    setTransformResult('Transformation removed');
    
    setTimeout(() => {
      closeTransformModal();
    }, 1500);
  };

  // Add a function to close the modal
  const closeTransformModal = () => {
    setIsTransformModalOpen(false);
    setTransformingNodeId(null);
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


  // Update the final transform function to handle real transformations
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
        
        // Get source values (in real app, this would be the actual data from CSV)
        const sourceValues = sourceData.columns[sourceColumnIndex].sampleValues;
        
        // Apply transformation - either AI or direct copy
        let transformedValues : any[] = [];
        
        if (transform.prompt) {
          // With AI transformation using OpenAI
          transformedValues = await processWithAI(sourceValues, transform.prompt, openAIKey);
        } else {
          // Simple direct copy
          transformedValues = [...sourceValues];
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
          <button
            className={`flex-1 py-3 text-sm font-medium ${
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
        </div>

        {/* Column Buttons */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'source' 
            ? adaptedSourceAnalysis.columns.map(renderColumnButton)
            : targetAnalysis 
              ? targetAnalysis.columns.map(renderColumnButton)
              : (
                <div className="p-4 text-center">
                  <input
                    type="file"
                    onChange={onTargetUpload}
                    accept=".csv"
                    className="hidden"
                    id="target-upload"
                  />
                  <label 
                    htmlFor="target-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    Upload Target CSV
                  </label>
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
      {isTransformModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Transform with AI</h3>
            </div>
            
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt for AI transformation
              </label>
              <textarea
                value={transformPrompt}
                onChange={(e) => setTransformPrompt(e.target.value)}
                className="w-full h-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#9966cc]"
                placeholder="Add instructions to transfor by AI..."
              />
              
              {transformResult && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium text-gray-700 mb-1">Result</div>
                  <div className="text-sm text-gray-600">{transformResult}</div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeTransformModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {/* Show Clear button only when editing an existing prompt */}
              {savedPrompts[transformingNodeId!] && (
                <button
                  onClick={handleClearPrompt}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  Clear
                </button>
              )}
              
              <button
                onClick={handleSavePrompt}
                disabled={!transformPrompt.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                  !transformPrompt.trim()
                    ? 'bg-[#b599e2] cursor-not-allowed'
                    : 'bg-[#9966cc] hover:bg-[#8a5bbf]'
                }`}
              >
                Accept
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
    </div>
  );
} 
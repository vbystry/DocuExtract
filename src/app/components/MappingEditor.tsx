'use client';

import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  Background,
  Controls,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface ColumnNode {
  name: string;
  type: string;
}

interface MappingEditorProps {
  sourceColumns: ColumnNode[];
  targetColumns: ColumnNode[];
}

// Custom node for columns
const ColumnNodeComponent = ({ data }: { data: ColumnNode }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border border-gray-200">
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
      <div className="flex flex-col">
        <div className="font-medium text-sm text-gray-800">{data.name}</div>
        <div className="text-xs text-gray-500">{data.type}</div>
      </div>
    </div>
  );
};

const nodeTypes = {
  columnNode: ColumnNodeComponent,
};

export default function MappingEditor({ }: MappingEditorProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        return nds.map((node) => {
          const change = changes.find((c: any) => c.id === node.id);
          if (change) {
            return {
              ...node,
              position: {
                x: change.position?.x || node.position.x,
                y: change.position?.y || node.position.y,
              },
            };
          }
          return node;
        });
      });
    },
    []
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
} 
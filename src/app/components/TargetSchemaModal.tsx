'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface ColumnDefinition {
  name: string;
  type: string;
}

interface TargetSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (columns: ColumnDefinition[]) => void;
  initialColumns?: ColumnDefinition[];
  mode?: 'create' | 'edit';
}

export default function TargetSchemaModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialColumns = [{ name: '', type: 'string' }],
  mode = 'create'
}: TargetSchemaModalProps) {
  const [columns, setColumns] = useState<ColumnDefinition[]>(initialColumns);

  useEffect(() => {
    if (isOpen) {
      setColumns(initialColumns);
    }
  }, [isOpen, initialColumns]);

  const addColumn = () => {
    setColumns([...columns, { name: '', type: 'string' }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: string) => {
    const newColumns = [...columns];
    newColumns[index][field] = value;
    setColumns(newColumns);
  };

  const handleSave = () => {
    if (columns.some(col => !col.name.trim())) {
      alert('All columns must have names');
      return;
    }
    
    const names = columns.map(col => col.name.trim());
    if (new Set(names).size !== names.length) {
      alert('Column names must be unique');
      return;
    }
    
    onSave(columns);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-w-full mx-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {mode === 'create' ? 'Create Target Schema' : 'Edit Target Schema'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Define the columns for your target data structure:
          </p>
          
          <div className="space-y-4">
            {columns.map((column, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Column Name</label>
                  <input
                    type="text"
                    value={column.name}
                    onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="e.g. firstName"
                  />
                </div>
                
                <div className="w-32">
                  <label className="block text-xs text-gray-600 mb-1">Data Type</label>
                  <select
                    value={column.type}
                    onChange={(e) => updateColumn(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
                
                <button
                  onClick={() => removeColumn(index)}
                  disabled={columns.length === 1}
                  className={`mt-6 p-1 rounded-md ${
                    columns.length === 1 
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            
            <button
              onClick={addColumn}
              className="flex items-center gap-1 text-sm text-[#9966cc] hover:text-[#8a5bbf]"
            >
              <Plus size={16} />
              Add Column
            </button>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#9966cc] rounded-md hover:bg-[#8a5bbf]"
          >
            {mode === 'create' ? 'Create Schema' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
} 
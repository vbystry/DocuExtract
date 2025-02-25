'use client';

import { useState } from 'react';

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
  required: boolean;
  enumValues?: string[];
  arrayType?: 'string' | 'number' | 'boolean' | 'object';
  arrayObjectSchema?: SchemaField[];
}

interface ArrayObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fields: SchemaField[]) => void;
  existingFields?: SchemaField[];
}

export default function ArrayObjectModal({ isOpen, onClose, onSave, existingFields = [] }: ArrayObjectModalProps) {
  const [fields, setFields] = useState<SchemaField[]>(existingFields);
  const [newField, setNewField] = useState<SchemaField>({
    name: '',
    type: 'string',
    required: true
  });

  const addField = () => {
    if (newField.name) {
      setFields([...fields, newField]);
      setNewField({ name: '', type: 'string', required: true });
    }
  };

  const handleSave = () => {
    onSave(fields);
    setFields([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Define Object Schema</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Existing Fields */}
        {fields.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="font-medium text-gray-700">Defined Fields</h3>
            {fields.map((field, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-700">{field.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({field.type})</span>
                    {field.required && <span className="ml-2 text-red-500">*</span>}
                  </div>
                  <button
                    onClick={() => setFields(fields.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add New Field Form */}
        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={newField.name}
              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
              placeholder="Field name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value as SchemaField['type'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
              id="modalFieldRequired"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="modalFieldRequired" className="text-gray-700">Required field</label>
          </div>

          <button
            onClick={addField}
            disabled={!newField.name}
            className="w-full bg-blue-500 text-white rounded-md py-2 hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Field
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={fields.length === 0}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save Schema
          </button>
        </div>
      </div>
    </div>
  );
} 
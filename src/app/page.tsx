'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import ArrayObjectModal from './components/ArrayObjectModal';
import Header from './components/Header';

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array';
  required: boolean;
  enumValues?: string[];  // For enum type
  arrayType?: 'string' | 'number' | 'boolean' | 'object'; // For array type
  arrayObjectSchema?: SchemaField[]; // For array of objects
}

interface ProcessingResult {
  filename: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  details?: any;
}

interface ApiResponse {
  success: boolean;
  message: string;
  results?: ProcessingResult[];
  error?: string;
}

const generateZodSchemaPreview = (fields: SchemaField[]): { schema: string; example: any } => {
  const generateFieldExample = (field: SchemaField): any => {
    switch (field.type) {
      case 'string':
        return 'example text';
      case 'number':
        return 123;
      case 'boolean':
        return true;
      case 'date':
        return new Date().toISOString();
      case 'enum':
        return field.enumValues?.length ? field.enumValues[0] : 'example';
      case 'array':
        if (field.arrayType === 'object' && field.arrayObjectSchema?.length) {
          const objectExample = field.arrayObjectSchema.reduce((acc, f) => {
            acc[f.name] = generateFieldExample(f);
            return acc;
          }, {} as Record<string, any>);
          return [objectExample];
        } else {
          return field.arrayType === 'string' ? ['example'] :
                 field.arrayType === 'number' ? [123] :
                 field.arrayType === 'boolean' ? [true] : [];
        }
      default:
        return 'example';
    }
  };

  const example = fields.reduce((acc, field) => {
    acc[field.name] = field.required ? generateFieldExample(field) : 
      Math.random() > 0.5 ? generateFieldExample(field) : undefined;
    return acc;
  }, {} as Record<string, any>);

  return { schema: '', example }; // schema is kept for compatibility but not used
};

export default function Home() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [newField, setNewField] = useState<SchemaField>({
    name: '',
    type: 'string',
    required: true,
    enumValues: [],
    arrayType: 'string',
    arrayObjectSchema: []
  });
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enumValue, setEnumValue] = useState(''); // For enum input
  const [isDefiningArrayObject, setIsDefiningArrayObject] = useState(false);
  const [arrayObjectFields, setArrayObjectFields] = useState<SchemaField[]>([]);
  const [newArrayObjectField, setNewArrayObjectField] = useState<SchemaField>({
    name: '',
    type: 'string',
    required: true
  });
  const [isArrayObjectModalOpen, setIsArrayObjectModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => 
      file.name.endsWith('.docx') || file.name.endsWith('.pdf')
    );

    if (selectedFiles.length !== validFiles.length) {
      alert('Only .docx and .pdf files are allowed');
    }

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const addField = () => {
    if (newField.name) {
      setFields([...fields, newField]);
      setNewField({
        name: '',
        type: 'string',
        required: true,
        enumValues: [],
        arrayType: 'string',
        arrayObjectSchema: []
      });
      setArrayObjectFields([]); // Reset array object fields
    }
  };

  const addEnumValue = () => {
    if (enumValue && newField.enumValues) {
      setNewField({
        ...newField,
        enumValues: [...newField.enumValues, enumValue]
      });
      setEnumValue('');
    }
  };

  const removeEnumValue = (index: number) => {
    if (newField.enumValues) {
      setNewField({
        ...newField,
        enumValues: newField.enumValues.filter((_, i) => i !== index)
      });
    }
  };

  const addArrayObjectField = () => {
    if (newArrayObjectField.name) {
      setArrayObjectFields([...arrayObjectFields, newArrayObjectField]);
      setNewArrayObjectField({ name: '', type: 'string', required: true });
    }
  };

  const finishArrayObjectDefinition = () => {
    if (arrayObjectFields.length > 0) {
      setNewField({
        ...newField,
        arrayObjectSchema: arrayObjectFields
      });
      setIsDefiningArrayObject(false);
    }
  };

  const handleArrayTypeChange = (type: SchemaField['arrayType']) => {
    if (type === 'object') {
      setIsArrayObjectModalOpen(true);
    }
    setNewField({ 
      ...newField, 
      arrayType: type,
      arrayObjectSchema: type === 'object' ? [] : undefined
    });
  };

  const handleArrayObjectSchemaSave = (fields: SchemaField[]) => {
    setNewField({
      ...newField,
      arrayObjectSchema: fields
    });
  };

  const validateApiKey = (key: string) => {
    return key.startsWith('sk-') && key.length > 20;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isApiKeyValid) {
      alert('Please enter a valid OpenAI API key');
      return;
    }

    if (files.length === 0) {
      alert('Please select at least one document');
      return;
    }

    setIsProcessing(true);
    setResults([]);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('schema', JSON.stringify(fields));
    formData.append('apiKey', apiKey);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data: ApiResponse = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Upload failed');
      
      if (data.results) {
        // Redirect to results page with the results data
        const encodedResults = encodeURIComponent(JSON.stringify(data.results));
        router.push(`/results?results=${encodedResults}`);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed!');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFieldStructure = (field: SchemaField) => {
    return (
      <div key={field.name} className="bg-gray-50 rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div>
              <h3 className="font-medium text-gray-800">{field.name}</h3>
              <div className="mt-1 space-y-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {field.type}
                </span>
                {field.required && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    required
                  </span>
                )}
              </div>
            </div>

            {field.type === 'enum' && field.enumValues && field.enumValues.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-1">Enum Values:</p>
                <div className="flex flex-wrap gap-1">
                  {field.enumValues.map((value, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-200 rounded-md text-sm text-gray-700">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {field.type === 'array' && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-1">Array Type: {field.arrayType}</p>
                {field.arrayType === 'object' && field.arrayObjectSchema && (
                  <div className="mt-2 border-l-2 border-gray-300 pl-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Object Structure:</p>
                    <div className="space-y-2">
                      {field.arrayObjectSchema.map((objField, idx) => (
                        <div key={idx} className="bg-white rounded p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{objField.name}</span>
                            <span className="text-gray-500">({objField.type})</span>
                            {objField.required && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                                required
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Introduction Section */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              DocuExtract AI
            </h2>
            <p className="text-xl text-gray-600 mb-2">
              Intelligent Document Data Extraction
            </p>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Transform your documents into structured data using advanced AI. 
              Define your schema once, extract data from multiple documents instantly.
            </p>
          </div>

          {/* How It Works Section */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-gray-700 mb-6">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="text-blue-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-800 mb-2">1. Define Schema</h4>
                <p className="text-gray-600">Create a schema that defines the structure of data you want to extract</p>
              </div>
              <div className="bg-green-50 rounded-lg p-6">
                <div className="text-green-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-800 mb-2">2. Upload Documents</h4>
                <p className="text-gray-600">Upload one or more .docx files that contain your data</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-6">
                <div className="text-purple-600 mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-800 mb-2">3. Get Results</h4>
                <p className="text-gray-600">Receive structured data extracted from your documents</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* API Key Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-700">OpenAI API Key</h2>
                <p className="text-sm text-gray-500">
                  Enter your OpenAI API key to use the service. 
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 ml-1"
                  >
                    Get your API key here
                  </a>
                </p>
              </div>
              
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    setApiKey(newKey);
                    setIsApiKeyValid(validateApiKey(newKey));
                  }}
                  placeholder="sk-..."
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-opacity-50 ${
                    apiKey && !isApiKeyValid 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {apiKey && !isApiKeyValid && (
                  <p className="mt-1 text-sm text-red-600">
                    Please enter a valid OpenAI API key starting with 'sk-'
                  </p>
                )}
                {isApiKeyValid && (
                  <div className="absolute right-2 top-2.5 text-green-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-700">Document Upload</h2>
                <p className="text-sm text-gray-500">Select one or more .docx files to process</p>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".docx,.pdf"
                  multiple
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Drop files here or click to select</p>
                  <p className="text-xs text-gray-500">.docx and .pdf files are supported</p>
                </label>
              </div>

              {/* Selected Files List */}
              {files.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-700 mb-3">Selected Documents</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {files.map((file, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate text-gray-600">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Schema Definition Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-700">Schema Definition</h2>
                <p className="text-sm text-gray-500">Define the structure of your document data</p>
              </div>

              {/* Existing Fields */}
              {fields.length > 0 && (
                <div className="grid gap-3 mb-6">
                  {fields.map((field) => renderFieldStructure(field))}
                </div>
              )}

              {/* Add New Field Form */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium text-gray-700 mb-4">Add New Field</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    placeholder="Field name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ 
                      ...newField, 
                      type: e.target.value as SchemaField['type'],
                      enumValues: e.target.value === 'enum' ? [] : undefined,
                      arrayType: e.target.value === 'array' ? 'string' : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="enum">Enum</option>
                    <option value="array">Array</option>
                  </select>

                  {/* Enum Values Input */}
                  {newField.type === 'enum' && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={enumValue}
                          onChange={(e) => setEnumValue(e.target.value)}
                          placeholder="Add enum value"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={addEnumValue}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {newField.enumValues && newField.enumValues.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newField.enumValues.map((value, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                            >
                              {value}
                              <button
                                type="button"
                                onClick={() => removeEnumValue(index)}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Array Type Selection and Preview */}
                  {newField.type === 'array' && (
                    <div className="space-y-3">
                      <select
                        value={newField.arrayType}
                        onChange={(e) => handleArrayTypeChange(e.target.value as SchemaField['arrayType'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="string">String Array</option>
                        <option value="number">Number Array</option>
                        <option value="boolean">Boolean Array</option>
                        <option value="object">Object Array</option>
                      </select>

                      {/* Array Object Schema Preview */}
                      {newField.arrayType === 'object' && newField.arrayObjectSchema && newField.arrayObjectSchema.length > 0 && (
                        <div className="mt-3 bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Object Structure</h4>
                            <button
                              type="button"
                              onClick={() => setIsArrayObjectModalOpen(true)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Edit Structure
                            </button>
                          </div>
                          <div className="space-y-2">
                            {newField.arrayObjectSchema.map((objField, idx) => (
                              <div key={idx} className="bg-white rounded p-2 text-sm flex items-center gap-2">
                                <span className="font-medium text-gray-700">{objField.name}</span>
                                <span className="text-gray-500">({objField.type})</span>
                                {objField.required && (
                                  <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                                    required
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      id="required"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="required" className="text-gray-700">Required field</label>
                  </div>

                  <button
                    type="button"
                    onClick={addField}
                    className="w-full bg-blue-500 text-white rounded-md py-2 hover:bg-blue-600 transition-colors"
                  >
                    Add Field
                  </button>
                </div>
              </div>
            </div>

            {/* Array Object Modal */}
            <ArrayObjectModal
              isOpen={isArrayObjectModalOpen}
              onClose={() => setIsArrayObjectModalOpen(false)}
              onSave={handleArrayObjectSchemaSave}
              existingFields={newField.arrayObjectSchema}
            />

            {/* Schema Preview */}
            {fields.length > 0 && (
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">Expected Data Structure</h2>
                  <div className="text-sm text-gray-500">
                    Shows how your data should look
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm">
                    <code className="text-blue-400">
                      {JSON.stringify(generateZodSchemaPreview(fields).example, null, 2)}
                    </code>
                  </pre>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your document data will be extracted according to this structure
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={files.length === 0 || fields.length === 0}
              className="w-full bg-green-500 text-white rounded-lg py-3 px-4 hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Process Documents
            </button>
          </form>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-gray-700">Processing documents...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import officeparser from 'officeparser';
import pdf from 'pdf-parse/lib/pdf-parse'

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0;
const DEFAULT_MAX_TOKENS = 4096;
 
async function analyzeDocumentStructure(text: string, schema: z.ZodObject<any>, openai: OpenAI) {
  try {
    const instruction = `Extract and format the data according to the schema from this document text. Return only the JSON object with the extracted values.`;

    const prompts = [
      {
        role: "system" as const,
        content: "You are a precise document parser that extracts structured data according to provided schemas."
      },
      {
        role: "user" as const,
        content: text
      },
      {
        role: "user" as const,
        content: instruction
      }
    ];

    const result = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: prompts,
      temperature: DEFAULT_TEMPERATURE,
      max_tokens: DEFAULT_MAX_TOKENS,
      response_format: zodResponseFormat(schema, 'instruction')
    });

    if (!result.choices[0].message.content) {
      throw new Error('No content in OpenAI response');
    }

    return {
      ...JSON.parse(result.choices[0].message.content),
      sourceText: text // Add the original text
    };
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw new Error('Failed to analyze document structure');
  }
}

async function extractTextFromDocument(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.name.endsWith('.docx')) {
      return await officeparser.parseOfficeAsync(buffer);
    } else if (file.name.endsWith('.pdf')) {
      const pdfData = await pdf(buffer);
      return pdfData.text;
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw new Error(`Failed to extract text from ${file.name}`);
  }
}

function createDynamicSchema(fields: any[]) {
  const schemaObject: Record<string, any> = {};
  
  fields.forEach(field => {
    let fieldSchema;
    switch (field.type) {
      case 'string':
        fieldSchema = z.string();
        break;
      case 'number':
        fieldSchema = z.number();
        break;
      case 'boolean':
        fieldSchema = z.boolean();
        break;
      case 'date':
        fieldSchema = z.date();
        break;
      case 'enum':
        if (field.enumValues && field.enumValues.length > 0) {
          fieldSchema = z.enum(field.enumValues as [string, ...string[]]);
        } else {
          fieldSchema = z.string();
        }
        break;
      case 'array':
        switch (field.arrayType) {
          case 'string':
            fieldSchema = z.array(z.string());
            break;
          case 'number':
            fieldSchema = z.array(z.number());
            break;
          case 'boolean':
            fieldSchema = z.array(z.boolean());
            break;
          case 'object':
            if (field.arrayObjectSchema && field.arrayObjectSchema.length > 0) {
              const objectSchema = createDynamicSchema(field.arrayObjectSchema);
              fieldSchema = z.array(objectSchema);
            } else {
              fieldSchema = z.array(z.any());
            }
            break;
          default:
            fieldSchema = z.array(z.any());
        }
        break;
      default:
        fieldSchema = z.any();
    }
    
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaObject[field.name] = fieldSchema;
  });
  
  return z.object(schemaObject);
}

export const POST = async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const schemaJson = formData.get('schema') as string;
    const apiKey = formData.get('apiKey') as string;
    
    if (!apiKey?.startsWith('sk-')) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key' },
        { status: 400 }
      );
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate file types
    const invalidFiles = files.filter(file => 
      !file.name.endsWith('.docx') && !file.name.endsWith('.pdf')
    );
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Only .docx and .pdf files are allowed' },
        { status: 400 }
      );
    }
    
    // Parse the schema definition and create Zod schema
    const schemaFields = JSON.parse(schemaJson);
    const dynamicSchema = createDynamicSchema(schemaFields);

    // Initialize OpenAI client with provided key
    const openai = new OpenAI({
      apiKey: apiKey
    });

    // Process each file
    const results = await Promise.all(files.map(async (file) => {
      try {
        // Extract text from document
        const text = await extractTextFromDocument(file);
        
        if (!text) {
          return {
            filename: file.name,
            success: false,
            error: 'No text content found in document',
            sourceText: ''
          };
        }

        // Analyze document structure using OpenAI
        const extractedData = await analyzeDocumentStructure(text, dynamicSchema, openai);
        
        // Validate extracted data against schema
        try {
          const validatedData = dynamicSchema.parse(extractedData);
          return {
            filename: file.name,
            success: true,
            data: validatedData,
            sourceText: text
          };
        } catch (validationError) {
          return {
            filename: file.name,
            success: false,
            error: 'Schema validation failed',
            details: validationError,
            sourceText: text
          };
        }
      } catch (error) {
        return {
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          sourceText: ''
        };
      }
    }));
    
    return NextResponse.json({ 
      success: true,
      message: 'Files processed successfully',
      results
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Upload failed', error: String(error) },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if file is CSV or DOCX
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'csv' && fileExtension !== 'docx') {
      return NextResponse.json(
        { error: 'Only CSV and DOCX files are supported' },
        { status: 400 }
      );
    }

    // Process file based on extension
    if (fileExtension === 'csv') {
      return await processCSVFile(file, fileName);
    } else {
      return await processDOCXFile(file, fileName);
    }
    
  } catch (error) {
    console.error('File analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze file' },
      { status: 500 }
    );
  }
}

async function processCSVFile(file: File, fileName: string) {
  // Process CSV file
  const content = await file.text();
  const rows = parse(content, {
    skip_empty_lines: true,
    trim: true,
  });

  if (rows.length < 2) {
    return NextResponse.json(
      { error: 'CSV file must contain at least a header row and one data row' },
      { status: 400 }
    );
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  // Analyze columns
  const columns = headers.map((header, index) => {
    const values = dataRows.map(row => row[index] || '');
    const uniqueValues = new Set(values).size;
    const emptyValues = values.filter(v => v === '').length;
    
    return {
      name: header,
      type: detectColumnType(values),
      sampleValues: values.slice(0, 5),
      uniqueValues,
      emptyValues,
    };
  });
  
  return NextResponse.json({ 
    success: true, 
    fileType: 'csv',
    analysis: {
      fileName,
      totalRows: dataRows.length,
      totalColumns: headers.length,
      columns,
    } 
  });
}

async function processDOCXFile(file: File, fileName: string) {
  // Convert File to Buffer for mammoth
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Extract text from DOCX
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  
  // Simplify the response to just have the content and filename
  return NextResponse.json({
    success: true,
    fileType: 'docx',
    analysis: {
      fileName,
      content: text,
    }
  });
}

function detectColumnType(values: string[]): string {
  const nonEmptyValues = values.filter(v => v.trim() !== '');
  if (nonEmptyValues.length === 0) return 'unknown';

  const isNumber = (value: string) => !isNaN(Number(value)) && value.trim() !== '';
  const isDate = (value: string) => !isNaN(Date.parse(value)) && value.trim() !== '';
  const isBoolean = (value: string) => ['true', 'false', '0', '1', 'yes', 'no'].includes(value.toLowerCase());

  const allNumbers = nonEmptyValues.every(isNumber);
  const allDates = nonEmptyValues.every(isDate);
  const allBooleans = nonEmptyValues.every(isBoolean);

  if (allNumbers) return 'number';
  if (allDates) return 'date';
  if (allBooleans) return 'boolean';
  return 'string';
}
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

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

    // Check if file is CSV
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileExtension !== 'csv') {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

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
      analysis: {
        fileName,
        totalRows: dataRows.length,
        totalColumns: headers.length,
        columns,
      } 
    });
    
  } catch (error) {
    console.error('CSV analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CSV file' },
      { status: 500 }
    );
  }
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
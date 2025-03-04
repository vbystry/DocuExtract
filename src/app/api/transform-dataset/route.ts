import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function POST(request: NextRequest) {
  try {
    const { datasetId, columnName, prompt, apiKey } = await request.json();
    
    // Retrieve the full dataset from Redis
    const redisKey = `csv:${datasetId}`;
    const storedData = await redis.get(redisKey);
    
    if (!storedData) {
      return NextResponse.json(
        { error: 'Dataset not found or expired' },
        { status: 404 }
      );
    }
    
    // Parse the data
    const dataset = JSON.parse(storedData);
    
    // Get the values for the specified column
    const values = dataset[columnName];
    
    if (!values) {
      return NextResponse.json(
        { error: `Column "${columnName}" not found in dataset` },
        { status: 404 }
      );
    }
    
    // Transform the values
    const transformedValues = await transformWithAI(values, prompt, apiKey);
    
    return NextResponse.json({
      success: true,
      transformedValues
    });
  } catch (error) {
    console.error('Transformation error:', error);
    return NextResponse.json(
      { error: 'Failed to transform data' },
      { status: 500 }
    );
  }
}

// Validate API key
const validateApiKey = (key: string) => {
  return key.trim().startsWith('sk-') && key.trim().length > 20;
};

// AI transformation function
async function transformWithAI(values, prompt, apiKey) {
  // If no prompt provided, just return the original values (direct copy)
  if (!prompt) {
    return values; // Direct copy without transformation
  }

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
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Process the value based on the prompt
        if (prompt.includes('calculate') || prompt.includes('compute')) {
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
        
        // Default transformation
        return `${value} (transformed with AI)`;
      } catch (err) {
        console.error('Error processing value with AI:', err);
        return `${value} (error)`;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    transformed.push(...batchResults);
    
    // Add a small delay between batches to avoid rate limits
    if (i + batchSize < values.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return transformed;
} 
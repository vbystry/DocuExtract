import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { value, prompt } = await request.json();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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
    return NextResponse.json({ 
      result: data.choices[0].message.content.trim() 
    });
  } catch (error) {
    console.error('Error in transform API:', error);
    return NextResponse.json(
      { error: 'Failed to transform data' },
      { status: 500 }
    );
  }
} 
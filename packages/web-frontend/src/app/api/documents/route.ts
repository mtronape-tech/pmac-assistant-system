import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3005';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();
    
    // Передаем все параметры запроса
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value);
    }
    
    const response = await fetch(`${BACKEND_URL}/documents?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents from backend' },
      { status: 500 }
    );
  }
}

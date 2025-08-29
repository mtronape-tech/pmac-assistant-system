import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3005';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/stats`, {
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
    console.error('Error proxying stats to backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats from backend' },
      { status: 500 }
    );
  }
}

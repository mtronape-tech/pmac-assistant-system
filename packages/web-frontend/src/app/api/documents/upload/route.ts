import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3005';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const response = await fetch(`${BACKEND_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying upload to backend:', error);
    return NextResponse.json(
      { error: 'Failed to upload document to backend' },
      { status: 500 }
    );
  }
}

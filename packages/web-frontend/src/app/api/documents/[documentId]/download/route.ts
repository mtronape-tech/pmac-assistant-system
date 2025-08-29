import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3005';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const response = await fetch(`${BACKEND_URL}/documents/${params.documentId}/download`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    // Получаем файл как blob
    const blob = await response.blob();
    
    // Получаем заголовки для определения типа файла и имени
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    
    // Извлекаем имя файла из заголовка content-disposition
    let filename = 'document';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Возвращаем файл для скачивания
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error proxying document download to backend:', error);
    return NextResponse.json(
      { error: 'Failed to download document from backend' },
      { status: 500 }
    );
  }
}

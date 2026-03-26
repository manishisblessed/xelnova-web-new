import { NextRequest, NextResponse } from 'next/server';
import { getSeller, addDocument } from '@/lib/seller-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;

    const seller = getSeller(sellerId);
    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Document type is required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file instanceof File ? file.name : `document-${Date.now()}`;
    const mimeType = file.type || 'application/octet-stream';

    const doc = addDocument(sellerId, {
      type,
      fileName,
      fileSize: buffer.length,
      mimeType,
      buffer,
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, message: 'Failed to store document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        fileUrl: `memory://${sellerId}/${doc.id}`,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload document. Please try again.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

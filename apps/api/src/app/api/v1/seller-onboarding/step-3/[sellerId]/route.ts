import { NextRequest, NextResponse } from 'next/server';
import { getSeller, updateSeller } from '@/lib/seller-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;
    const body = await request.json();
    const { storeName, description, businessType, businessCategory } = body;

    const seller = getSeller(sellerId);
    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    if (!storeName || !businessType || !businessCategory) {
      return NextResponse.json(
        { success: false, message: 'Store name, business type, and category are required' },
        { status: 400 }
      );
    }

    const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    updateSeller(sellerId, {
      storeName,
      slug,
      description: description || '',
      businessType,
      businessCategory,
      onboardingStep: 4,
    });

    return NextResponse.json({
      success: true,
      message: 'Store details saved',
      data: { nextStep: 4 },
    });
  } catch (error) {
    console.error('Step-3 error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save store details' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

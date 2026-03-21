import { NextRequest, NextResponse } from 'next/server';
import { getSeller, updateSeller } from '@/lib/seller-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;
    const body = await request.json();
    const { gstNumber, sellsNonGstProducts, panNumber, panName } = body;

    const seller = getSeller(sellerId);
    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    if (!panNumber || !panName) {
      return NextResponse.json(
        { success: false, message: 'PAN number and name are required' },
        { status: 400 }
      );
    }

    updateSeller(sellerId, {
      gstNumber: sellsNonGstProducts ? undefined : gstNumber,
      gstVerified: !!gstNumber,
      sellsNonGstProducts: !!sellsNonGstProducts,
      panNumber,
      panName,
      onboardingStep: 3,
    });

    return NextResponse.json({
      success: true,
      message: 'Tax details saved',
      data: { nextStep: 3 },
    });
  } catch (error) {
    console.error('Step-2 error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save tax details' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

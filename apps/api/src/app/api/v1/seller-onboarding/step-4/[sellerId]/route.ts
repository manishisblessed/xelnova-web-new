import { NextRequest, NextResponse } from 'next/server';
import { getSeller, updateSeller } from '@/lib/seller-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;
    const body = await request.json();
    const { pincode, city, state, address } = body;

    const seller = getSeller(sellerId);
    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    if (!pincode || !city || !state || !address) {
      return NextResponse.json(
        { success: false, message: 'All address fields are required' },
        { status: 400 }
      );
    }

    updateSeller(sellerId, {
      businessPincode: pincode,
      businessCity: city,
      businessState: state,
      businessAddress: address,
      onboardingStep: 5,
    });

    return NextResponse.json({
      success: true,
      message: 'Address saved',
      data: { nextStep: 5 },
    });
  } catch (error) {
    console.error('Step-4 error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save address' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

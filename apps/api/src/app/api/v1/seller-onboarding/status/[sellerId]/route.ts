import { NextRequest, NextResponse } from 'next/server';
import { getSeller } from '@/lib/seller-store';

export async function GET(
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

    return NextResponse.json({
      success: true,
      data: {
        sellerId: seller.id,
        status: seller.onboardingStatus,
        step: seller.onboardingStep,
        storeName: seller.storeName,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get status' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

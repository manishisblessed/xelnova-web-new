import { NextRequest, NextResponse } from 'next/server';
import { getSeller, updateSeller } from '@/lib/seller-store';

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

    updateSeller(sellerId, {
      onboardingStatus: 'UNDER_REVIEW',
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted for review. You will be notified once approved.',
      data: {
        sellerId: seller.id,
        status: 'UNDER_REVIEW',
      },
    });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json(
      { success: false, message: 'Submission failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

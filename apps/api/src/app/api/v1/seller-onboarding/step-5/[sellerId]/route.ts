import { NextRequest, NextResponse } from 'next/server';
import { getSeller, updateSeller } from '@/lib/seller-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;
    const body = await request.json();
    const { shippingMethod, offerFreeDelivery, deliveryCharge1to3Days, deliveryCharge3PlusDays } = body;

    const seller = getSeller(sellerId);
    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    if (!shippingMethod) {
      return NextResponse.json(
        { success: false, message: 'Shipping method is required' },
        { status: 400 }
      );
    }

    updateSeller(sellerId, {
      shippingMethod,
      offerFreeDelivery: !!offerFreeDelivery,
      deliveryCharge1to3Days: offerFreeDelivery ? undefined : deliveryCharge1to3Days,
      deliveryCharge3PlusDays: offerFreeDelivery ? undefined : deliveryCharge3PlusDays,
      onboardingStep: 6,
    });

    return NextResponse.json({
      success: true,
      message: 'Shipping preferences saved',
      data: { nextStep: 6 },
    });
  } catch (error) {
    console.error('Step-5 error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save shipping preferences' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSeller, updateSeller } from '@/lib/seller-store';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;
    const body = await request.json();
    const { accountHolderName, accountNumber, ifscCode } = body;

    const seller = getSeller(sellerId);
    if (!seller) {
      return NextResponse.json(
        { success: false, message: 'Seller not found' },
        { status: 404 }
      );
    }

    if (!accountHolderName || !accountNumber || !ifscCode) {
      return NextResponse.json(
        { success: false, message: 'All bank details are required' },
        { status: 400 }
      );
    }

    updateSeller(sellerId, {
      bankAccountName: accountHolderName,
      bankAccountNumber: accountNumber,
      bankIfscCode: ifscCode,
      bankVerified: true,
      onboardingStep: 7,
    });

    return NextResponse.json({
      success: true,
      message: 'Bank details saved',
      data: { completed: true },
    });
  } catch (error) {
    console.error('Step-6 error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save bank details' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

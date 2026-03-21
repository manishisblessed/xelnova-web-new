import { NextRequest, NextResponse } from 'next/server';
import { getOtp, markOtpVerified } from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const { identifier, type, otp } = await request.json();

    if (!identifier || !type || !otp) {
      return NextResponse.json(
        { success: false, message: 'Identifier, type, and OTP are required' },
        { status: 400 }
      );
    }

    const record = getOtp(type, identifier);

    if (!record) {
      return NextResponse.json(
        { success: false, message: 'No OTP found. Please request a new one.' },
        { status: 400 }
      );
    }

    if (record.expiresAt < Date.now()) {
      return NextResponse.json(
        { success: false, message: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (record.verified) {
      return NextResponse.json(
        { success: false, message: 'OTP already verified' },
        { status: 400 }
      );
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    const verificationToken = markOtpVerified(type, identifier);

    return NextResponse.json({
      success: true,
      message: `${type === 'EMAIL' ? 'Email' : 'Phone'} verified successfully`,
      data: { verificationToken },
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { success: false, message: 'Verification failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from 'next/server';
import { generateOtp, storeOtp } from '@/lib/otp-store';
import { sendOtpSms } from '@/lib/sms-service';

export async function POST(request: NextRequest) {
  try {
    const { identifier, type, purpose } = await request.json();

    if (!identifier || !type) {
      return NextResponse.json(
        { success: false, message: 'Identifier and type are required' },
        { status: 400 }
      );
    }

    if (type === 'EMAIL') {
      if (!/\S+@\S+\.\S+/.test(identifier)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email address' },
          { status: 400 }
        );
      }
    } else if (type === 'PHONE') {
      if (!/^[6-9]\d{9}$/.test(identifier)) {
        return NextResponse.json(
          { success: false, message: 'Invalid phone number' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Type must be EMAIL or PHONE' },
        { status: 400 }
      );
    }

    const otp = generateOtp();
    storeOtp(type, identifier, otp);

    if (type === 'PHONE') {
      const sent = await sendOtpSms(identifier, otp);
      if (!sent) {
        console.error(`[OTP] SMS delivery failed for ${identifier}`);
        return NextResponse.json(
          { success: false, message: 'Failed to send SMS. Please try again.' },
          { status: 502 }
        );
      }
      console.log(`[OTP] SMS sent to ${identifier} (purpose: ${purpose || 'general'})`);
    } else {
      // Email OTP — log for dev, integrate Resend for production
      console.log(`[OTP] EMAIL to ${identifier}: ${otp} (purpose: ${purpose || 'general'})`);
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${type === 'EMAIL' ? 'email' : 'phone'}`,
      data: {
        expiresIn: 600,
        ...(process.env.NODE_ENV !== 'production' && type === 'EMAIL' && { devOtp: otp }),
      },
    });
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

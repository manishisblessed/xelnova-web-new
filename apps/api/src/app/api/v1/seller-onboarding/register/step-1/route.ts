import { NextRequest, NextResponse } from 'next/server';
import { createSeller } from '@/lib/seller-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, emailVerificationToken, phoneVerificationToken, captchaToken } = body;

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!emailVerificationToken) {
      return NextResponse.json(
        { success: false, message: 'Email verification required' },
        { status: 400 }
      );
    }

    if (!phoneVerificationToken) {
      return NextResponse.json(
        { success: false, message: 'Phone verification required' },
        { status: 400 }
      );
    }

    if (!captchaToken) {
      return NextResponse.json(
        { success: false, message: 'Captcha verification required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const seller = createSeller({ fullName, email, phone, password });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        userId: seller.userId,
        sellerId: seller.id,
        nextStep: 2,
      },
    });
  } catch (error) {
    console.error('Registration step-1 error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

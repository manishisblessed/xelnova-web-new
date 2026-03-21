import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCaptcha, deleteCaptcha } from '@/lib/captcha-store';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, answer } = await request.json();

    if (!sessionId || answer === undefined || answer === null) {
      return NextResponse.json(
        { success: false, message: 'Session ID and answer are required' },
        { status: 400 }
      );
    }

    const session = getCaptcha(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Captcha session expired or not found. Please try again.' },
        { status: 400 }
      );
    }

    if (session.expiresAt < Date.now()) {
      deleteCaptcha(sessionId);
      return NextResponse.json(
        { success: false, message: 'Captcha expired. Please generate a new one.' },
        { status: 400 }
      );
    }

    if (session.solved) {
      return NextResponse.json(
        { success: false, message: 'Captcha already solved' },
        { status: 400 }
      );
    }

    if (answer.toString() === session.answer) {
      session.solved = true;
      const captchaToken = `captcha-${randomUUID()}`;

      return NextResponse.json({
        success: true,
        message: 'Captcha verified successfully',
        data: { captchaToken },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Incorrect answer. Please try again.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Captcha verify error:', error);
    return NextResponse.json(
      { success: false, message: 'Verification failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Role',
    },
  });
}

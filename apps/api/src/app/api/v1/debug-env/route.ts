import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    BACKEND_URL: process.env.BACKEND_URL || '(not set)',
    NODE_ENV: process.env.NODE_ENV || '(not set)',
    has_env_keys: Object.keys(process.env).filter(k => k.includes('BACKEND') || k.includes('AMPLIFY')),
  });
}

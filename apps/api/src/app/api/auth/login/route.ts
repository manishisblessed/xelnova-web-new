import { NextRequest, NextResponse } from 'next/server';

export type DashboardRole = 'admin' | 'seller';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: DashboardRole;
  avatar?: string | null;
}

export interface LoginBody {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  role: DashboardRole;
  user: DashboardUser;
  expiresIn: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginBody = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Please use the production authentication endpoint' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

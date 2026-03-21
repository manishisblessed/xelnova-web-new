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

const MOCK_USERS: Record<string, { user: DashboardUser; password: string }> = {
  'admin@xelnova.com': {
    user: {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@xelnova.com',
      role: 'admin',
      avatar: null,
    },
    password: 'admin123',
  },
  'seller@xelnova.com': {
    user: {
      id: 'seller-1',
      name: 'Seller User',
      email: 'seller@xelnova.com',
      role: 'seller',
      avatar: null,
    },
    password: 'seller123',
  },
};

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

    const normalizedEmail = email.trim().toLowerCase();
    const mock = MOCK_USERS[normalizedEmail];

    if (!mock || mock.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const expiresIn = body.remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24;
    const token = `mock-jwt-${mock.user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response: LoginResponse = {
      token,
      role: mock.user.role,
      user: mock.user,
      expiresIn,
    };

    return NextResponse.json({ success: true, data: response });
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

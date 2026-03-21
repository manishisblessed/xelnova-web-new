import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = '435713810993-9c2c2j1nh7hcm374mruihfuf4807fuat.apps.googleusercontent.com';

export type DashboardRole = 'admin' | 'seller' | 'customer';

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: DashboardRole;
  avatar?: string | null;
}

interface GoogleTokenBody {
  idToken: string;
  role?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GoogleTokenBody = await request.json();
    const { idToken, role = 'customer' } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: 'ID token is required' },
        { status: 400 }
      );
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return NextResponse.json(
          { success: false, message: 'Invalid token payload' },
          { status: 401 }
        );
      }

      const userRole: DashboardRole = 
        role === 'admin' ? 'admin' : 
        role === 'seller' ? 'seller' : 
        'customer';

      const user: DashboardUser = {
        id: `google-${payload.sub}`,
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        role: userRole,
        avatar: payload.picture || null,
      };

      const accessToken = `mock-jwt-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const refreshToken = `mock-refresh-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      return NextResponse.json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
          isNewUser: false,
        },
      });
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError);
      return NextResponse.json(
        { success: false, message: 'Invalid Google token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const identifier = request.ip || 'anonymous';
    const allowed = await rateLimit(identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Original implementation would go here
    return NextResponse.json({
      message: 'Success! Rate limit check passed.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
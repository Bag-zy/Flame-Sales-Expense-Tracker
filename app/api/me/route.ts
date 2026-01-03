import { NextRequest, NextResponse } from 'next/server'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/me:
 *   get:
 *     operationId: getCurrentSessionUser
 *     tags:
 *       - Auth
 *       - Users
 *     summary: Get the current authenticated user
 *     description: Returns the current user associated with the provided API key.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Current authenticated user.
 *       401:
 *         description: API key required.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    return NextResponse.json({ status: 'success', user });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ status: 'error', message: 'Database error' }, { status: 500 });
  }
}

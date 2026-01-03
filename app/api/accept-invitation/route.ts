import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';

/**
 * @swagger
 * /api/accept-invitation:
 *   get:
 *     operationId: validateInvitationToken
 *     tags:
 *       - Users
 *     summary: Validate an invitation token
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation is valid; returns invited user info.
 *       400:
 *         description: Missing token.
 *       404:
 *         description: Invitation invalid or expired.
 *   post:
 *     operationId: acceptInvitation
 *     tags:
 *       - Users
 *     summary: Accept an invitation and activate account
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: Account activated successfully.
 *       400:
 *         description: Missing invitation token.
 *       401:
 *         description: API key required.
 *       403:
 *         description: Authenticated user does not match invited user.
 *       404:
 *         description: Invitation invalid or expired.
 */

// GET handler to validate a token and get user info
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ status: 'error', message: 'Invitation token is missing.' }, { status: 400 });
  }

  try {
    const result = await db.query(`
      SELECT u.email, u.employee_name as username, o.name as organizationName
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.invitation_token = $1 AND u.invitation_expires_at > NOW() AND u.status = 'pending'
    `, [token]);

    if (result.rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Invitation is invalid or has expired.' }, { status: 404 });
    }

    return NextResponse.json({ status: 'success', user: result.rows[0] });
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return NextResponse.json({ status: 'error', message: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// POST handler to activate an account
export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.id || !user.email) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ status: 'error', message: 'Invitation token is missing.' }, { status: 400 });
    }

    const result = await db.query(
      'SELECT id, email FROM users WHERE invitation_token = $1 AND invitation_expires_at > NOW() AND status = $2',
      [token, 'pending']
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Invitation is invalid or has expired.' }, { status: 404 });
    }

    const pendingUser = result.rows[0];

    // Ensure the authenticated user's email matches the invited email
    if (pendingUser.email !== user.email) {
      return NextResponse.json({ status: 'error', message: 'Authenticated user does not match the invited user.' }, { status: 403 });
    }

    // Activate the user. We keep the same logic of copying oauth_sub/provider
    // from the authenticated session user record via subqueries.
    await db.query(
      `
      UPDATE users
      SET status = 'active',
          invitation_token = NULL,
          invitation_expires_at = NULL,
          oauth_sub = (SELECT oauth_sub FROM users WHERE id = $1),
          oauth_provider = (SELECT oauth_provider FROM users WHERE id = $1)
      WHERE id = $2;
      `,
      [user.id, pendingUser.id]
    );

    // The sessionUser record might be a separate, temporary record created by the auth system on first login.
    // If the invited user ID is different from the session user ID, we can consider deleting the temporary one.
    if (pendingUser.id !== user.id) {
      await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    }

    return NextResponse.json({ status: 'success', message: 'Account activated successfully.' });
  } catch (error) {
    console.error('Error activating account:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to activate account.' }, { status: 500 });
  }
}

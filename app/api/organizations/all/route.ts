import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/organizations/all:
 *   get:
 *     operationId: listOrganizationsCreatedByUser
 *     tags:
 *       - Organizations
 *     summary: List organizations created by the current user
 *     description: Returns organizations created by the user associated with the provided API key.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Organizations fetched successfully.
 *       401:
 *         description: API key required.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.id) {
      // No authenticated user, or user record not found
      return NextResponse.json(
        { status: 'error', message: 'API key required' },
        { status: 401 }
      );
    }

    const result = user.role === 'admin'
      ? await db.query(
          `
          SELECT id, name, created_at, country_code, currency_code, currency_symbol
            FROM organizations
           WHERE created_by = $1
              OR id = $2
           ORDER BY name
          `,
          [user.id, user.organizationId],
        )
      : await db.query(
          `
          SELECT id, name, created_at, country_code, currency_code, currency_symbol
            FROM organizations
           WHERE id = $1
           ORDER BY name
          `,
          [user.organizationId],
        );

    return NextResponse.json({
      status: 'success',
      organizations: result.rows
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch organizations' }, { status: 500 });
  }
}
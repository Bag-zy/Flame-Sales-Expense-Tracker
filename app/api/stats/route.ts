import { NextRequest, NextResponse } from 'next/server';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';
import { StatsService } from '@/lib/services/stats-service';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/stats:
 *   get:
 *     operationId: getDashboardStats
 *     tags:
 *       - Reports
 *     summary: Get dashboard statistics for the current organization
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Dashboard statistics fetched successfully.
 *       401:
 *         description: API key required.
 *       500:
 *         description: Failed to fetch statistics.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const userOrgId = user.organizationId;

    const stats = await StatsService.getDashboardStatsByOrganization(userOrgId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';
import { computeAmountInOrgCurrency } from '@/lib/org-currency';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/reports/sales-breakdown:
 *   get:
 *     operationId: getSalesBreakdown
 *     tags:
 *       - Reports
 *     summary: Get sales breakdown by product or customer
 *     description: Returns aggregated sales amounts grouped by product or customer, optionally filtered by project/cycle.
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: query
 *         name: dimension
 *         required: false
 *         description: Breakdown dimension (product or customer).
 *         schema:
 *           type: string
 *           enum: [product, customer]
 *       - in: query
 *         name: projectId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: cycleId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sales breakdown data.
 *       401:
 *         description: API key required.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawDimension = searchParams.get('dimension');
    const dimension = rawDimension === 'product' ? 'product' : 'customer';
    const projectId = searchParams.get('projectId');
    const cycleId = searchParams.get('cycleId');
    const organizationId = user.organizationId;
    const isOrgLevelView = !projectId;

    const allowedProjectsParam: number[] | null = user.role === 'admin'
      ? null
      : (
          await db.query(
            `
            SELECT DISTINCT pa.project_id
              FROM project_assignments pa
              JOIN projects p ON p.id = pa.project_id
             WHERE p.organization_id = $1
               AND pa.user_id = $2
            UNION
            SELECT DISTINCT pa.project_id
              FROM project_assignments pa
              JOIN team_members tm ON tm.team_id = pa.team_id
              JOIN projects p ON p.id = pa.project_id
             WHERE p.organization_id = $1
               AND tm.user_id = $2
            `,
            [organizationId, user.id],
          )
        ).rows.map((r: any) => Number(r.project_id)).filter((n: number) => Number.isFinite(n));

    if (user.role !== 'admin' && projectId) {
      const allowed = (allowedProjectsParam ?? []).includes(Number(projectId));
      if (!allowed) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    const params: (number | string | null | number[])[] = [organizationId, projectId, cycleId, allowedProjectsParam];

    let query = '';

    if (dimension === 'product') {
      query = `
        SELECT
          p.product_name AS label,
          s.project_id,
          SUM(s.amount) AS total_sales
        FROM sales s
        JOIN products p ON s.product_id = p.id
        WHERE s.organization_id = $1
          AND ($2::int IS NULL OR s.project_id = $2::int)
          AND ($3::int IS NULL OR s.cycle_id = $3::int)
          AND ($4::int[] IS NULL OR s.project_id = ANY($4::int[]))
        GROUP BY p.product_name, s.project_id
        ORDER BY total_sales DESC
      `;
    } else {
      query = `
        SELECT
          COALESCE(s.customer_name, 'Unknown') AS label,
          s.project_id,
          SUM(s.amount) AS total_sales
        FROM sales s
        WHERE s.organization_id = $1
          AND ($2::int IS NULL OR s.project_id = $2::int)
          AND ($3::int IS NULL OR s.cycle_id = $3::int)
          AND ($4::int[] IS NULL OR s.project_id = ANY($4::int[]))
        GROUP BY COALESCE(s.customer_name, 'Unknown'), s.project_id
        ORDER BY total_sales DESC
      `;
    }

    const result = await db.query(query, params);

    const totalsByLabel = new Map<string, number>();

    for (const row of result.rows) {
      const rawAmount = parseFloat(row.total_sales) || 0;
      if (!rawAmount) continue;

      let convertedAmount = rawAmount;
      if (isOrgLevelView) {
        const projectIdValue = row.project_id != null ? Number(row.project_id) : null;
        convertedAmount = await computeAmountInOrgCurrency(
          organizationId,
          projectIdValue,
          rawAmount,
        );
      }

      const label: string = row.label;
      const current = totalsByLabel.get(label) ?? 0;
      totalsByLabel.set(label, current + convertedAmount);
    }

    const data = Array.from(totalsByLabel.entries())
      .map(([label, totalSales]) => ({ label, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);

    return NextResponse.json({
      status: 'success',
      dimension,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch sales breakdown:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

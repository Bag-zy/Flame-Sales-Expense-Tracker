import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';
import { computeAmountInOrgCurrency } from '@/lib/org-currency';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/analytics/expenses-by-category:
 *   get:
 *     operationId: getExpensesByCategory
 *     tags:
 *       - Reports
 *     summary: Get aggregated expenses by category
 *     description: Returns total expenses by category for a project or the whole organization.
 *     security:
 *       - stackSession: []
 *     parameters:
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
 *         description: Aggregated expenses by category.
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

    const result = await db.query(
      `
      SELECT 
        ec.category_name,
        e.project_id,
        SUM(e.amount) as total_amount
      FROM expenses e
      JOIN expense_category ec ON e.category_id = ec.id
      WHERE e.organization_id = $1
        AND ($2::int IS NULL OR e.project_id = $2::int)
        AND ($3::int IS NULL OR e.cycle_id = $3::int)
        AND ($4::int[] IS NULL OR e.project_id = ANY($4::int[]))
      GROUP BY ec.category_name, e.project_id
      ORDER BY total_amount DESC
    `,
      params
    );

    const totalsByCategory = new Map<string, number>();

    for (const row of result.rows) {
      const rawAmount = parseFloat(row.total_amount) || 0;
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

      const category = row.category_name as string;
      const current = totalsByCategory.get(category) ?? 0;
      totalsByCategory.set(category, current + convertedAmount);
    }

    const data = Array.from(totalsByCategory.entries())
      .map(([category_name, total_amount]) => ({ category_name, total_amount }))
      .sort((a, b) => b.total_amount - a.total_amount);

    return NextResponse.json({
      status: 'success',
      data,
    });
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch expenses by category' }, { status: 500 });
  }
}

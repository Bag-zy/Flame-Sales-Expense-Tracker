import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';
import { computeAmountInOrgCurrency } from '@/lib/org-currency';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/reports/budget-vs-actual:
 *   get:
 *     operationId: getBudgetVsActualByCycle
 *     tags:
 *       - Reports
 *     summary: Get budget vs actual amounts by cycle
 *     description: Returns budget, actual expenses, actual revenue and variance per cycle for an organization or project.
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget vs actual data per cycle.
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

    const params: (number | string | null | number[])[] = [organizationId, projectId, allowedProjectsParam];

    const query = `
      SELECT
        c.id AS cycle_id,
        c.cycle_name,
        c.project_id,
        COALESCE(c.budget_allotment, 0) AS budget,
        COALESCE(expenses.total_expenses, 0) AS actual_expenses,
        COALESCE(sales.total_revenue, 0) AS actual_revenue
      FROM cycles c
      LEFT JOIN (
        SELECT
          cycle_id,
          SUM(amount) AS total_expenses
        FROM expenses
        WHERE organization_id = $1
        GROUP BY cycle_id
      ) expenses ON expenses.cycle_id = c.id
      LEFT JOIN (
        SELECT
          cycle_id,
          SUM(amount) AS total_revenue
        FROM sales
        WHERE organization_id = $1
        GROUP BY cycle_id
      ) sales ON sales.cycle_id = c.id
      WHERE c.organization_id = $1
        AND ($2::int IS NULL OR c.project_id = $2::int)
        AND ($3::int[] IS NULL OR c.project_id = ANY($3::int[]))
      ORDER BY c.start_date NULLS FIRST, c.id;
    `;

    const result = await db.query(query, params);

    const data = await Promise.all(
      result.rows.map(async (row) => {
        let budget = parseFloat(row.budget) || 0;
        let actualExpenses = parseFloat(row.actual_expenses) || 0;
        let actualRevenue = parseFloat(row.actual_revenue) || 0;

        if (isOrgLevelView) {
          const projectIdValue = row.project_id != null ? Number(row.project_id) : null;
          budget = await computeAmountInOrgCurrency(
            organizationId,
            projectIdValue,
            budget,
          );
          actualExpenses = await computeAmountInOrgCurrency(
            organizationId,
            projectIdValue,
            actualExpenses,
          );
          actualRevenue = await computeAmountInOrgCurrency(
            organizationId,
            projectIdValue,
            actualRevenue,
          );
        }

        return {
          cycleId: row.cycle_id,
          cycleName: row.cycle_name,
          budget,
          actualExpenses,
          actualRevenue,
          variance: budget - actualExpenses,
        };
      }),
    );

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Failed to fetch budget vs actual by cycle:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

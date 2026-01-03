import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';
import { computeAmountInOrgCurrency } from '@/lib/org-currency';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/reports/pnl-by-project:
 *   get:
 *     operationId: getPnlByProject
 *     tags:
 *       - Reports
 *     summary: Get profit and loss by project
 *     description: Returns total revenue, total expenses, and net profit per project for the current organization.
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
 *         description: P&L data by project.
 *       401:
 *         description: API key required.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { organizationId } = user;
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const cycleId = searchParams.get('cycleId');
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

    const query = `
      WITH project_revenue AS (
        SELECT
          project_id,
          SUM(amount) AS total_revenue
        FROM sales
        WHERE organization_id = $1
          AND ($2::int IS NULL OR project_id = $2::int)
          AND ($3::int IS NULL OR cycle_id = $3::int)
          AND ($4::int[] IS NULL OR project_id = ANY($4::int[]))
        GROUP BY project_id
      ),
      project_expenses AS (
        SELECT
          project_id,
          SUM(amount) AS total_expenses
        FROM expenses
        WHERE organization_id = $1
          AND ($2::int IS NULL OR project_id = $2::int)
          AND ($3::int IS NULL OR cycle_id = $3::int)
          AND ($4::int[] IS NULL OR project_id = ANY($4::int[]))
        GROUP BY project_id
      )
      SELECT
        p.id AS project_id,
        p.project_name,
        COALESCE(r.total_revenue, 0) AS total_revenue,
        COALESCE(e.total_expenses, 0) AS total_expenses
      FROM projects p
      LEFT JOIN project_revenue r ON r.project_id = p.id
      LEFT JOIN project_expenses e ON e.project_id = p.id
      WHERE p.organization_id = $1
        AND ($2::int IS NULL OR p.id = $2::int)
        AND ($4::int[] IS NULL OR p.id = ANY($4::int[]))
      ORDER BY p.project_name;
    `;

    const result = await db.query(query, params);

    const data = await Promise.all(
      result.rows.map(async (row) => {
        let totalRevenue = parseFloat(row.total_revenue) || 0;
        let totalExpenses = parseFloat(row.total_expenses) || 0;

        if (isOrgLevelView) {
          const projectIdValue = row.project_id != null ? Number(row.project_id) : null;
          totalRevenue = await computeAmountInOrgCurrency(
            organizationId,
            projectIdValue,
            totalRevenue,
          );
          totalExpenses = await computeAmountInOrgCurrency(
            organizationId,
            projectIdValue,
            totalExpenses,
          );
        }

        return {
          projectId: row.project_id,
          projectName: row.project_name,
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
        };
      }),
    );

    return NextResponse.json({ status: 'success', data });
  } catch (error) {
    console.error('Failed to fetch P&L by project:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     operationId: listInvoices
 *     tags:
 *       - Invoices
 *     summary: List invoices for the current organization
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: cycle_id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: customer_id
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoices fetched successfully.
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
    const projectId = searchParams.get('project_id');
    const cycleId = searchParams.get('cycle_id');
    const customerId = searchParams.get('customer_id');

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

    if (user.role !== 'admin') {
      if (!allowedProjectsParam?.length) {
        return NextResponse.json({ status: 'success', invoices: [] });
      }
      if (projectId && !allowedProjectsParam.includes(Number(projectId))) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    const params: any[] = [organizationId];
    let idx = 2;

    // Always scope by organization
    let where = 'i.organization_id = $1';

    if (user.role !== 'admin') {
      params.push(allowedProjectsParam);
      where += `
        AND EXISTS (
          SELECT 1
            FROM invoice_sales inv_sx
            JOIN sales sx ON sx.id = inv_sx.sale_id
           WHERE inv_sx.invoice_id = i.id
             AND sx.organization_id = i.organization_id
             AND sx.project_id = ANY($${idx}::int[])
        )
        AND NOT EXISTS (
          SELECT 1
            FROM invoice_sales inv_sy
            JOIN sales sy ON sy.id = inv_sy.sale_id
           WHERE inv_sy.invoice_id = i.id
             AND sy.organization_id = i.organization_id
             AND (sy.project_id IS NULL OR NOT (sy.project_id = ANY($${idx}::int[])))
        )
      `;
      idx += 1;
    }

    // When filtering by project/cycle, also include invoices that are not linked to any sales
    // (invoice-first flow), so they still show up regardless of project/cycle selection.
    if (projectId) {
      params.push(parseInt(projectId, 10));
      // For non-admin users we do not include invoice-first rows (s.id IS NULL).
      where += user.role === 'admin'
        ? ` AND (s.project_id = $${idx} OR s.id IS NULL)`
        : ` AND s.project_id = $${idx}`;
      idx += 1;
    }

    if (cycleId) {
      params.push(parseInt(cycleId, 10));
      where += user.role === 'admin'
        ? ` AND (s.cycle_id = $${idx} OR s.id IS NULL)`
        : ` AND s.cycle_id = $${idx}`;
      idx += 1;
    }

    if (customerId) {
      params.push(parseInt(customerId, 10));
      where += ` AND i.customer_id = $${idx}`;
      idx += 1;
    }

    const result = await db.query(
      `SELECT
         i.id,
         i.invoice_number,
         i.invoice_date,
         i.due_date,
         i.currency,
         i.net_amount,
         i.vat_amount,
         i.gross_amount,
         i.status,
         i.pdf_url,
         i.customer_id,
         c.name AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN invoice_sales inv_s ON inv_s.invoice_id = i.id
       LEFT JOIN sales s ON s.id = inv_s.sale_id
       WHERE ${where}
       GROUP BY i.id, c.name
       ORDER BY i.invoice_date DESC NULLS LAST, i.id DESC
       LIMIT 200`,
      params
    );

    return NextResponse.json({ status: 'success', invoices: result.rows });
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}

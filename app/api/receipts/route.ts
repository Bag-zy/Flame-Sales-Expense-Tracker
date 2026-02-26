import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';

/**
 * @swagger
 * /api/receipts:
 *   get:
 *     operationId: listReceipts
 *     tags:
 *       - Receipts
 *     summary: List receipts for expenses
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
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Receipts fetched successfully.
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createReceipt
 *     tags:
 *       - Receipts
 *     summary: Create a receipt record linked to an expense
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expense_id:
 *                 type: integer
 *                 nullable: true
 *               file_path:
 *                 type: string
 *               raw_text:
 *                 type: string
 *                 nullable: true
 *               structured_data:
 *                 type: object
 *                 nullable: true
 *             required:
 *               - file_path
 *     responses:
 *       200:
 *         description: Receipt created successfully.
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
    const id = searchParams.get('id');
    const expenseId = searchParams.get('expense_id');
    const projectId = searchParams.get('project_id');
    const cycleId = searchParams.get('cycle_id');
    const search = searchParams.get('search');

    if (user.role !== 'admin' && projectId) {
      const access = await db.query(
        `
        SELECT 1
          FROM project_assignments pa
         WHERE pa.project_id = $1 AND pa.user_id = $2
        UNION
        SELECT 1
          FROM project_assignments pa
          JOIN team_members tm ON tm.team_id = pa.team_id
         WHERE pa.project_id = $1 AND tm.user_id = $2
         LIMIT 1
        `,
        [projectId, user.id],
      );

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    let query = `
      SELECT r.id, r.expense_id, r.file_path, r.upload_date, r.organization_id, r.raw_text, r.structured_data
      FROM receipts r
      LEFT JOIN expenses e ON e.id = r.expense_id
      WHERE r.organization_id = $1
    `;
    const params: any[] = [organizationId];
    let paramIndex = 1;

    if (projectId) {
      paramIndex += 1;
      query += ` AND e.project_id = $${paramIndex}`;
      params.push(projectId);
    }

    if (expenseId) {
      paramIndex += 1;
      query += ` AND r.expense_id = $${paramIndex}`;
      params.push(expenseId);
    }

    if (id) {
      paramIndex += 1;
      query += ` AND r.id = $${paramIndex}`;
      params.push(id);
    }

    if (cycleId) {
      paramIndex += 1;
      query += ` AND e.cycle_id = $${paramIndex}`;
      params.push(cycleId);
    }

    if (search) {
      paramIndex += 1;
      query += ` AND (r.raw_text ILIKE $${paramIndex} OR CAST(r.structured_data AS TEXT) ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
    }

    query += id ? ' LIMIT 1' : ' ORDER BY r.upload_date DESC';

    const result = await db.query(query, params);

    return NextResponse.json({
      status: 'success',
      receipts: result.rows,
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch receipts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const { organizationId } = user;

    // DB schema now includes raw_text and structured_data
    const { expense_id, file_path, raw_text, structured_data } = await request.json();

    if (user.role !== 'admin') {
      if (!expense_id) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }

      const exp = await db.query(
        'SELECT project_id FROM expenses WHERE id = $1 AND organization_id = $2',
        [expense_id, organizationId],
      );
      const project_id = exp.rows[0]?.project_id;
      if (!project_id) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }

      const access = await db.query(
        `
        SELECT 1
          FROM project_assignments pa
         WHERE pa.project_id = $1 AND pa.user_id = $2
        UNION
        SELECT 1
          FROM project_assignments pa
          JOIN team_members tm ON tm.team_id = pa.team_id
         WHERE pa.project_id = $1 AND tm.user_id = $2
         LIMIT 1
        `,
        [project_id, user.id],
      );

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    if (!file_path) {
      return NextResponse.json({ status: 'error', message: 'file_path is required' }, { status: 400 });
    }

    const result = await db.query(
      'INSERT INTO receipts (expense_id, file_path, raw_text, structured_data, organization_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [expense_id || null, file_path, raw_text || null, structured_data || null, organizationId]
    );

    return NextResponse.json({
      status: 'success',
      receipt: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating receipt:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to create receipt' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const { organizationId } = user;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Receipt ID is required' }, { status: 400 });
    }

    const result = await db.query(
      'DELETE FROM receipts WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to delete receipt' }, { status: 500 });
  }
}
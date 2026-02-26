import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { isUserMidSetup } from '@/lib/api-auth'

/**
 * @swagger
 * /api/expense-categories:
 *   get:
 *     operationId: listExpenseCategories
 *     tags:
 *       - Expense Categories
 *     summary: List expense categories
 *     description: Returns expense categories for the current organization (or global presets during setup).
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
 *         description: Expense categories fetched successfully.
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createExpenseCategory
 *     tags:
 *       - Expense Categories
 *     summary: Create a new expense category
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category_name:
 *                 type: string
 *               project_category_id:
 *                 type: integer
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               organization_id:
 *                 type: integer
 *                 nullable: true
 *               project_id:
 *                 type: integer
 *                 nullable: true
 *             required:
 *               - category_name
 *     responses:
 *       200:
 *         description: Expense category created successfully.
 *       401:
 *         description: API key required.
 *   put:
 *     operationId: updateExpenseCategory
 *     tags:
 *       - Expense Categories
 *     summary: Update an existing expense category
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               category_name:
 *                 type: string
 *               project_category_id:
 *                 type: integer
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - id
 *               - category_name
 *     responses:
 *       200:
 *         description: Expense category updated successfully.
 *       401:
 *         description: API key required.
 *   delete:
 *     operationId: deleteExpenseCategory
 *     tags:
 *       - Expense Categories
 *     summary: Delete an expense category
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense category deleted successfully.
 *       401:
 *         description: API key required.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    const midSetup = await isUserMidSetup(request);

    if (!user?.id || (!user.organizationId && !midSetup)) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');

    if (midSetup) {
      const result = await db.query('SELECT * FROM expense_category WHERE organization_id IS NULL ORDER BY category_name');
      return NextResponse.json({
        status: 'success',
        categories: result.rows,
      });
    }

    const { organizationId } = user;

    if (id) {
      const result = await db.query(
        'SELECT * FROM expense_category WHERE organization_id = $1 AND id = $2',
        [organizationId, id]
      );
      return NextResponse.json({
        status: 'success',
        categories: result.rows,
      });
    }

    if (projectId) {
      const result = await db.query(
        'SELECT * FROM expense_category WHERE organization_id = $1 AND (project_id = $2 OR project_id IS NULL) ORDER BY category_name',
        [organizationId, projectId]
      );
      return NextResponse.json({
        status: 'success',
        categories: result.rows,
      });
    }

    const result = await db.query(
      'SELECT * FROM expense_category WHERE organization_id = $1 ORDER BY category_name',
      [organizationId]
    );

    return NextResponse.json({
      status: 'success',
      categories: result.rows,
    });
  } catch (error: any) {
    console.error('Expense categories API error:', error)
    return NextResponse.json({
      status: 'error',
      message: `Failed to fetch expense categories: ${error.message}`
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { category_name, project_category_id, description, organization_id, project_id } = await request.json();
    const orgId = organization_id || user.organizationId;

    if (!orgId) {
      return NextResponse.json({ status: 'error', message: 'Organization ID is required' }, { status: 400 });
    }

    const result = await db.query(
      'INSERT INTO expense_category (category_name, project_category_id, description, organization_id, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category_name, project_category_id || null, description || null, orgId, project_id || null]
    );

    return NextResponse.json({
      status: 'success',
      category: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating expense category:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create expense category',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }
    const { organizationId } = user

    const { id, category_name, project_category_id, description } = await request.json()

    const result = await db.query(
      'UPDATE expense_category SET category_name = $1, project_category_id = $2, description = $3 WHERE id = $4 AND organization_id = $5 RETURNING *',
      [category_name, project_category_id, description, id, organizationId]
    )

    return NextResponse.json({
      status: 'success',
      category: result.rows[0],
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update expense category',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }
    const { organizationId } = user

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    await db.query('DELETE FROM expense_category WHERE id = $1 AND organization_id = $2', [id, organizationId])

    return NextResponse.json({
      status: 'success',
      message: 'Expense category deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete expense category',
      },
      { status: 500 }
    )
  }
}
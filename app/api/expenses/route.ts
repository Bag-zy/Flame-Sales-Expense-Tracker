import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { computeAmountInOrgCurrency } from '@/lib/org-currency'

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     operationId: listExpenses
 *     tags:
 *       - Expenses
 *     summary: List expenses
 *     description: List expenses for the authenticated user's organization with optional filters.
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
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: string
 *           default: '100'
 *     responses:
 *       200:
 *         description: Expenses fetched successfully.
 *       401:
 *         description: API key required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: API key required
 *   post:
 *     operationId: createExpense
 *     tags:
 *       - Expenses
 *     summary: Create a new expense
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                 type: integer
 *                 nullable: true
 *               category_id:
 *                 type: integer
 *                 nullable: true
 *               vendor_id:
 *                 type: integer
 *                 nullable: true
 *               payment_method_id:
 *                 type: integer
 *                 nullable: true
 *               cycle_id:
 *                 type: integer
 *                 nullable: true
 *               expense_name:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               amount:
 *                 type: number
 *               expense_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *             required:
 *               - amount
 *     responses:
 *       200:
 *         description: Expense created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 expense:
 *                   $ref: '#/components/schemas/Expense'
 *       401:
 *         description: API key required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: API key required
 *   put:
 *     operationId: updateExpense
 *     tags:
 *       - Expenses
 *     summary: Update an existing expense
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
 *               project_id:
 *                 type: integer
 *                 nullable: true
 *               category_id:
 *                 type: integer
 *                 nullable: true
 *               vendor_id:
 *                 type: integer
 *                 nullable: true
 *               payment_method_id:
 *                 type: integer
 *                 nullable: true
 *               cycle_id:
 *                 type: integer
 *                 nullable: true
 *               expense_name:
 *                 type: string
 *                 nullable: true
 *               description:
 *                 type: string
 *                 nullable: true
 *               amount:
 *                 type: number
 *               expense_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *             required:
 *               - id
 *               - amount
 *     responses:
 *       200:
 *         description: Expense updated successfully.
 *       401:
 *         description: API key required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: API key required
 *   delete:
 *     operationId: deleteExpense
 *     tags:
 *       - Expenses
 *     summary: Delete an expense
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
 *         description: Expense deleted successfully.
 *       401:
 *         description: API key required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                   example: API key required
 */

export async function GET(request: Request) {
  try {
    const user = await getApiOrSessionUser(request as NextRequest)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }
    const { organizationId } = user
    
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const cycleId = searchParams.get('cycle_id')
    const search = searchParams.get('search')
    const limit = searchParams.get('limit') || '100'
    
    let query = 'SELECT * FROM expenses WHERE organization_id = $1'
    const params: any[] = [organizationId]
    let paramCount = 1

    if (user.role !== 'admin') {
      if (projectId) {
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
        )
        if (!access.rows.length) {
          return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
        }
      }

      paramCount++
      query += ` AND project_id IN (
        SELECT pa.project_id FROM project_assignments pa WHERE pa.user_id = $${paramCount}
        UNION
        SELECT pa.project_id FROM project_assignments pa JOIN team_members tm ON tm.team_id = pa.team_id WHERE tm.user_id = $${paramCount}
      )`
      params.push(user.id)
    }
    
    if (projectId) {
      paramCount++
      query += ` AND project_id = $${paramCount}`
      params.push(projectId)
    }
    
    if (cycleId) {
      paramCount++
      query += ` AND cycle_id = $${paramCount}`
      params.push(cycleId)
    }
    
    if (search) {
      paramCount++
      query += ` AND (description ILIKE $${paramCount} OR expense_name ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }
    
    query += ` ORDER BY date_time_created DESC LIMIT $${paramCount + 1}`
    params.push(parseInt(limit))
    
    const result = await db.query(query, params)
    return NextResponse.json({ 
      status: 'success', 
      expenses: result.rows 
    })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to fetch expenses' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }
    const { organizationId, id: userId } = user

    const { project_id, category_id, vendor_id, payment_method_id, cycle_id, expense_name, description, amount, expense_date } = await request.json()

    if (user.role !== 'admin') {
      if (!project_id) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
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
        [project_id, userId],
      )

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
      }
    }

    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0') || 0
    const amountOrgCcy = await computeAmountInOrgCurrency(organizationId, project_id || null, numericAmount)

    const result = await db.query(
      'INSERT INTO expenses (project_id, category_id, vendor_id, payment_method_id, cycle_id, expense_name, description, amount, amount_org_ccy, date_time_created, organization_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [project_id || null, category_id || null, vendor_id || null, payment_method_id || null, cycle_id || null, expense_name || null, description || null, numericAmount, amountOrgCcy, expense_date || new Date().toISOString(), organizationId, userId]
    )
    
    return NextResponse.json({ 
      status: 'success', 
      expense: result.rows[0] 
    })
  } catch (error) {
    console.error('Expense creation error:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to create expense' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }
    const { organizationId } = user

    const { id, project_id, category_id, vendor_id, payment_method_id, cycle_id, expense_name, description, amount, expense_date } = await request.json()

    if (user.role !== 'admin') {
      const existing = await db.query(
        'SELECT project_id FROM expenses WHERE id = $1 AND organization_id = $2',
        [id, organizationId],
      )
      if (!existing.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
      }

      const targetProjectId = project_id ?? existing.rows[0]?.project_id
      if (!targetProjectId) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
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
        [targetProjectId, user.id],
      )

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
      }
    }

    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0') || 0
    const amountOrgCcy = await computeAmountInOrgCurrency(organizationId, project_id || null, numericAmount)

    const result = await db.query(
      'UPDATE expenses SET project_id = $1, category_id = $2, vendor_id = $3, payment_method_id = $4, cycle_id = $5, expense_name = $6, description = $7, amount = $8, amount_org_ccy = $9, date_time_created = $10 WHERE id = $11 AND organization_id = $12 RETURNING *',
      [project_id, category_id, vendor_id, payment_method_id, cycle_id, expense_name || null, description, numericAmount, amountOrgCcy, expense_date, id, organizationId]
    )
    
    return NextResponse.json({ 
      status: 'success', 
      expense: result.rows[0] 
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to update expense' 
    }, { status: 500 })
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

    if (user.role !== 'admin') {
      const existing = await db.query(
        'SELECT project_id FROM expenses WHERE id = $1 AND organization_id = $2',
        [id, organizationId],
      )
      const project_id = existing.rows[0]?.project_id
      if (!project_id) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
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
      )

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
      }
    }
    
    await db.query('DELETE FROM expenses WHERE id = $1 AND organization_id = $2', [id, organizationId])
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Expense deleted successfully' 
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to delete expense' 
    }, { status: 500 })
  }
}
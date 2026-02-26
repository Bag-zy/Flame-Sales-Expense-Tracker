import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
// Refresh

/**
 * @swagger
 * /api/users:
 *   get:
 *     operationId: listUsers
 *     tags:
 *       - Users
 *     summary: List users in the current organization
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Users fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: API key required.
 *   delete:
 *     operationId: deleteCurrentUserAccount
 *     tags:
 *       - Users
 *     summary: Delete the currently authenticated user account
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Account deleted successfully.
 *       401:
 *         description: API key required.
 *   patch:
 *     operationId: updateCurrentUserProfile
 *     tags:
 *       - Users
 *     summary: Update profile details for the current user
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               employee_name:
 *                 type: string
 *                 nullable: true
 *               phone_number:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       401:
 *         description: API key required.
 *   put:
 *     operationId: updateUserRole
 *     tags:
 *       - Users
 *     summary: Update a user's role (admin only)
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *             required:
 *               - userId
 *               - role
 *     responses:
 *       200:
 *         description: User role updated successfully.
 *       400:
 *         description: Missing userId or role.
 *       403:
 *         description: Forbidden.
 *       401:
 *         description: API key required.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const result = await db.query(
      'SELECT id, email, employee_name, user_role, phone_number, created_at, organization_id FROM users WHERE organization_id = $1 ORDER BY created_at DESC',
      [user.organizationId]
    )

    return NextResponse.json({ status: 'success', users: result.rows })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ status: 'error', message: 'Database connection failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)

    if (!user) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    // Delete dependent rows before removing the user to avoid FK violations.
    // Order matters: assistant_mcp_keys references api_keys, which references users.
    // organizations.created_by is handled by ON DELETE SET NULL constraint.
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM assistant_mcp_keys WHERE user_id = $1', [user.id])
      await tx.query('DELETE FROM api_keys WHERE user_id = $1', [user.id])
      await tx.query('DELETE FROM project_assignments WHERE user_id = $1', [user.id])
      await tx.query('DELETE FROM users WHERE id = $1', [user.id])
    })

    console.log(`User ${user.id} deleted successfully`)
    return NextResponse.json({ status: 'success', message: 'Account deleted' })
  } catch (error) {
    console.error('Error deleting user account:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to delete account' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { employee_name, phone_number } = await request.json()

    await db.query(
      'UPDATE users SET employee_name = COALESCE($1, employee_name), phone_number = COALESCE($2, phone_number) WHERE id = $3',
      [employee_name ?? null, phone_number ?? null, user.id],
    )

    return NextResponse.json({ status: 'success', message: 'Profile updated' })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to update profile' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (user?.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    const { userId, role } = await request.json()
    if (!userId || !role) {
      return NextResponse.json({ status: 'error', message: 'Missing userId or role' }, { status: 400 })
    }

    // Ensure the target user is in the same organization as the admin.
    const targetUserResult = await db.query('SELECT organization_id FROM users WHERE id = $1', [userId])

    if (targetUserResult.rows.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Target user not found' }, { status: 404 })
    }

    if (targetUserResult.rows[0].organization_id !== user.organizationId) {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    await db.query('UPDATE users SET user_role = $1 WHERE id = $2', [role, userId])
    return NextResponse.json({ status: 'success', message: 'User role updated' })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to update user role' }, { status: 500 })
  }
}
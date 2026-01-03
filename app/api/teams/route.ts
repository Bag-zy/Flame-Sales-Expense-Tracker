import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

/**
 * @swagger
 * /api/teams:
 *   get:
 *     operationId: listTeams
 *     tags:
 *       - Teams
 *     summary: List teams in the current organization
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Teams fetched successfully.
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createTeam
 *     tags:
 *       - Teams
 *     summary: Create a new team (admin only)
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               team_lead_id:
 *                 type: integer
 *                 nullable: true
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Team created successfully.
 *       400:
 *         description: Validation error.
 *       403:
 *         description: Forbidden.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const result = await db.query(
      'SELECT * FROM teams WHERE organization_id = $1 ORDER BY name',
      [user.organizationId]
    )

    return NextResponse.json({ status: 'success', teams: result.rows })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (user?.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    const { name, team_lead_id } = await request.json()
    if (!name) {
      return NextResponse.json({ status: 'error', message: 'Team name is required' }, { status: 400 })
    }

    const result = await db.query(
      'INSERT INTO teams (name, organization_id, team_lead_id) VALUES ($1, $2, $3) RETURNING *',
      [name, user.organizationId, team_lead_id || null]
    )

    return NextResponse.json({ status: 'success', team: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to create team' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

/**
 * @swagger
 * /api/teams/{teamId}/members:
 *   get:
 *     operationId: listTeamMembers
 *     tags:
 *       - Teams
 *     summary: List members of a specific team
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team members fetched successfully.
 *       401:
 *         description: API key required.
 *       403:
 *         description: Forbidden.
 */

export async function GET(request: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const teamId = parseInt(params.teamId, 10)

    // Verify that the team belongs to the user's organization
    const teamResult = await db.query('SELECT organization_id FROM teams WHERE id = $1', [teamId])
    if (teamResult.rows.length === 0 || teamResult.rows[0].organization_id !== user.organizationId) {
      return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
    }

    const result = await db.query(
      'SELECT * FROM team_members WHERE team_id = $1',
      [teamId]
    )

    return NextResponse.json({ status: 'success', members: result.rows })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ status: 'error', message: 'Failed to fetch team members' }, { status: 500 })
  }
}

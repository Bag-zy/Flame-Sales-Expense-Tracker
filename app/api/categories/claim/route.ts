import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/categories/claim:
 *   post:
 *     operationId: claimCategoriesForProject
 *     tags:
 *       - Projects
 *     summary: Attach existing project and expense categories to a project
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: integer
 *               projectCategoryIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *               expenseCategoryIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *             required:
 *               - projectId
 *     responses:
 *       200:
 *         description: Categories claimed successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: API key required.
 */

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.id || !user.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { projectId, projectCategoryIds, expenseCategoryIds } = await request.json();

    if (!projectId) {
      return NextResponse.json({ status: 'error', message: 'Project ID is required' }, { status: 400 });
    }

    if (projectCategoryIds && projectCategoryIds.length > 0) {
      await db.query(
        'UPDATE project_categories SET project_id = $1 WHERE id = ANY($2::int[]) AND organization_id = $3',
        [projectId, projectCategoryIds, user.organizationId]
      );
    }

    if (expenseCategoryIds && expenseCategoryIds.length > 0) {
      await db.query(
        'UPDATE expense_category SET project_id = $1 WHERE id = ANY($2::int[]) AND organization_id = $3',
        [projectId, expenseCategoryIds, user.organizationId]
      );
    }

    return NextResponse.json({
      status: 'success',
      message: 'Categories claimed successfully',
    });
  } catch (error) {
    console.error('Error claiming categories:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to claim categories',
      },
      { status: 500 }
    );
  }
}

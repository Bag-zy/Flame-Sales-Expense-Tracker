import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { isUserMidSetup } from '@/lib/api-auth'

/**
 * @swagger
 * /api/project-categories:
 *   get:
 *     operationId: listProjectCategories
 *     tags:
 *       - Project Categories
 *     summary: List project categories
 *     description: Returns project categories for the current organization (or global presets during setup).
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
 *         description: Project categories fetched successfully.
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createProjectCategory
 *     tags:
 *       - Project Categories
 *     summary: Create a new project category
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
 *               description:
 *                 type: string
 *                 nullable: true
 *               is_custom:
 *                 type: boolean
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
 *         description: Project category created successfully.
 *   put:
 *     operationId: updateProjectCategory
 *     tags:
 *       - Project Categories
 *     summary: Update an existing project category
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
 *               description:
 *                 type: string
 *                 nullable: true
 *               is_custom:
 *                 type: boolean
 *             required:
 *               - id
 *               - category_name
 *     responses:
 *       200:
 *         description: Project category updated successfully.
 *   delete:
 *     operationId: deleteProjectCategory
 *     tags:
 *       - Project Categories
 *     summary: Delete a project category
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
 *         description: Project category deleted successfully.
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

    if (midSetup) {
      const result = await db.query('SELECT * FROM project_categories WHERE organization_id IS NULL ORDER BY category_name');
      return NextResponse.json({
        status: 'success',
        categories: result.rows,
      });
    }

    if (projectId) {
      const result = await db.query(
        'SELECT * FROM project_categories WHERE (organization_id = $1 OR organization_id IS NULL) AND (project_id = $2 OR project_id IS NULL) ORDER BY category_name',
        [user.organizationId, projectId]
      );

      return NextResponse.json({
        status: 'success',
        categories: result.rows,
      });
    }

    const result = await db.query(
      'SELECT * FROM project_categories WHERE (organization_id = $1 OR organization_id IS NULL) AND project_id IS NULL ORDER BY category_name',
      [user.organizationId]
    );

    return NextResponse.json({
      status: 'success',
      categories: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch project categories',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.id) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { category_name, description, is_custom, organization_id, project_id } = await request.json();
    const orgId = organization_id || user.organizationId;

    if (!orgId) {
      return NextResponse.json({ status: 'error', message: 'Organization ID is required' }, { status: 400 });
    }

    const result = await db.query(
      'INSERT INTO project_categories (category_name, description, is_custom, organization_id, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category_name, description || null, is_custom ? 1 : 0, orgId, project_id || null]
    );

    return NextResponse.json({
      status: 'success',
      category: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating project category:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create project category',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { id, category_name, description, is_custom } = await request.json();

    const result = await db.query(
      'UPDATE project_categories SET category_name = $1, description = $2, is_custom = $3 WHERE id = $4 AND organization_id = $5 RETURNING *',
      [category_name, description, is_custom, id, user.organizationId]
    );

    return NextResponse.json({
      status: 'success',
      category: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update project category',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    await db.query('DELETE FROM project_categories WHERE id = $1 AND organization_id = $2', [id, user.organizationId]);

    return NextResponse.json({
      status: 'success',
      message: 'Project category deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete project category',
      },
      { status: 500 }
    );
  }
}
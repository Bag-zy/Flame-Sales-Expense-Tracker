import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

/**
 * @swagger
 * /api/payment-methods:
 *   get:
 *     operationId: listPaymentMethods
 *     tags:
 *       - Payment Methods
 *     summary: List payment methods
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Payment methods fetched successfully.
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createPaymentMethod
 *     tags:
 *       - Payment Methods
 *     summary: Create a new payment method
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method_name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - method_name
 *     responses:
 *       200:
 *         description: Payment method created successfully.
 *   put:
 *     operationId: updatePaymentMethod
 *     tags:
 *       - Payment Methods
 *     summary: Update an existing payment method
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
 *               method_name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - id
 *               - method_name
 *     responses:
 *       200:
 *         description: Payment method updated successfully.
 *   delete:
 *     operationId: deletePaymentMethod
 *     tags:
 *       - Payment Methods
 *     summary: Delete a payment method
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
 *         description: Payment method deleted successfully.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const result = await db.query(
      'SELECT id, method_name AS payment_method, description, organization_id FROM payment_methods WHERE organization_id = $1 ORDER BY method_name',
      [user.organizationId]
    );
    return NextResponse.json({
      status: 'success',
      payment_methods: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch payment methods',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }

    const { method_name, description } = await request.json();

    const result = await db.query(
      'INSERT INTO payment_methods (method_name, description, organization_id) VALUES ($1, $2, $3) RETURNING id, method_name AS payment_method, description, organization_id',
      [method_name, description, user.organizationId]
    );

    return NextResponse.json({
      status: 'success',
      payment_method: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create payment method',
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

    const { id, method_name, description } = await request.json();

    const result = await db.query(
      'UPDATE payment_methods SET method_name = $1, description = $2 WHERE id = $3 AND organization_id = $4 RETURNING id, method_name AS payment_method, description, organization_id',
      [method_name, description, id, user.organizationId]
    );

    return NextResponse.json({
      status: 'success',
      payment_method: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update payment method',
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

    await db.query('DELETE FROM payment_methods WHERE id = $1 AND organization_id = $2', [id, user.organizationId]);

    return NextResponse.json({
      status: 'success',
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete payment method',
      },
      { status: 500 }
    );
  }
}
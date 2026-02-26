import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     operationId: listVendors
 *     tags:
 *       - Vendors
 *     summary: List vendors in the current organization
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Vendors fetched successfully.
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createVendor
 *     tags:
 *       - Vendors
 *     summary: Create a new vendor
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendor_name:
 *                 type: string
 *               contact_person:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               phone:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - vendor_name
 *     responses:
 *       200:
 *         description: Vendor created successfully.
 *       401:
 *         description: API key required.
 *   put:
 *     operationId: updateVendor
 *     tags:
 *       - Vendors
 *     summary: Update an existing vendor
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
 *               vendor_name:
 *                 type: string
 *               contact_person:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               phone:
 *                 type: string
 *                 nullable: true
 *               address:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - id
 *               - vendor_name
 *     responses:
 *       200:
 *         description: Vendor updated successfully.
 *       401:
 *         description: API key required.
 *   delete:
 *     operationId: deleteVendor
 *     tags:
 *       - Vendors
 *     summary: Delete a vendor
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
 *         description: Vendor deleted successfully.
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

    if (id) {
      const result = await db.query(
        'SELECT * FROM vendors WHERE organization_id = $1 AND id = $2',
        [organizationId, id]
      );
      return NextResponse.json({
        status: 'success',
        vendors: result.rows,
      });
    }

    const result = await db.query(
      'SELECT * FROM vendors WHERE organization_id = $1 ORDER BY vendor_name',
      [organizationId]
    );
    return NextResponse.json({
      status: 'success',
      vendors: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch vendors',
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
    const { organizationId } = user;

    const { vendor_name, contact_person, email, phone, address } = await request.json();

    const result = await db.query(
      'INSERT INTO vendors (vendor_name, contact_person, email, phone, address, organization_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [vendor_name, contact_person, email, phone, address, organizationId]
    )

    return NextResponse.json({
      status: 'success',
      vendor: result.rows[0]
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to create vendor'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const { organizationId } = user;

    const { id, vendor_name, contact_person, email, phone, address } = await request.json();

    const result = await db.query(
      'UPDATE vendors SET vendor_name = $1, contact_person = $2, email = $3, phone = $4, address = $5 WHERE id = $6 AND organization_id = $7 RETURNING *',
      [vendor_name, contact_person, email, phone, address, id, organizationId]
    )

    return NextResponse.json({
      status: 'success',
      vendor: result.rows[0]
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to update vendor'
    }, { status: 500 })
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

    await db.query('DELETE FROM vendors WHERE id = $1 AND organization_id = $2', [id, organizationId])

    return NextResponse.json({
      status: 'success',
      message: 'Vendor deleted successfully'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to delete vendor'
    }, { status: 500 })
  }
}
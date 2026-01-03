import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getApiOrSessionUser } from '@/lib/api-auth-keys';
import { isUserMidSetup } from '@/lib/api-auth';
import { seedVariantTypes } from '@/lib/seed-variant-types';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/variant-types:
 *   get:
 *     operationId: listVariantTypes
 *     tags:
 *       - Lookups
 *     summary: List product variant types and their units of measurement
 *     security:
 *       - stackSession: []
 *     responses:
 *       200:
 *         description: Variant types fetched successfully (seeding if necessary).
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

    // First, try to get the variant types
    const result = await db.query(`
      SELECT 
        vt.id,
        vt.type_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', uom.id, 'unit_name', uom.unit_name)
            ORDER BY uom.unit_name
          ) FILTER (WHERE uom.id IS NOT NULL), 
          '[]'::json
        ) as units
      FROM variant_types vt
      LEFT JOIN units_of_measurement uom ON vt.id = uom.variant_type_id
      GROUP BY vt.id, vt.type_name
      ORDER BY vt.type_name
    `);

    // If no variant types exist, seed the database with defaults
    if (result.rows.length === 0) {
      await seedVariantTypes();
      
      // Fetch the data again after seeding
      const seededResult = await db.query(`
        SELECT 
          vt.id,
          vt.type_name,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT('id', uom.id, 'unit_name', uom.unit_name)
              ORDER BY uom.unit_name
            ) FILTER (WHERE uom.id IS NOT NULL), 
            '[]'::json
          ) as units
        FROM variant_types vt
        LEFT JOIN units_of_measurement uom ON vt.id = uom.variant_type_id
        GROUP BY vt.id, vt.type_name
        ORDER BY vt.type_name
      `);
      
      return NextResponse.json({
        status: 'success',
        variantTypes: seededResult.rows
      });
    }

    return NextResponse.json({
      status: 'success',
      variantTypes: result.rows
    });
 } catch (error) {
    console.error('Error fetching variant types:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fetch variant types'
    }, { status: 500 });
  }
}
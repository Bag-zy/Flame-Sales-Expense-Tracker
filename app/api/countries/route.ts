import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * @swagger
 * /api/countries:
 *   get:
 *     operationId: listCountries
 *     tags:
 *       - Lookups
 *     summary: List supported countries and their currencies
 *     responses:
 *       200:
 *         description: Countries fetched successfully.
 *       500:
 *         description: Failed to fetch countries.
 */

export async function GET(_request: NextRequest) {
  try {
    const result = await db.query(
      'SELECT code, name, currency_code FROM countries ORDER BY name',
    );

    return NextResponse.json({
      status: 'success',
      countries: result.rows,
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch countries' },
      { status: 500 },
    );
  }
}

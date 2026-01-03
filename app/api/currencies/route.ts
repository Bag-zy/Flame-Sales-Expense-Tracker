import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * @swagger
 * /api/currencies:
 *   get:
 *     operationId: listCurrencies
 *     tags:
 *       - Lookups
 *     summary: List supported currencies
 *     responses:
 *       200:
 *         description: Currencies fetched successfully.
 *       500:
 *         description: Failed to fetch currencies.
 */

export async function GET(_request: NextRequest) {
  try {
    const result = await db.query(
      'SELECT code, name FROM currencies ORDER BY code',
    );

    return NextResponse.json({
      status: 'success',
      currencies: result.rows,
    });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to fetch currencies' }, { status: 500 });
  }
}

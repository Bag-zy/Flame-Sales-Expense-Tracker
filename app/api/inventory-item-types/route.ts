import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const inventoryItemTypes = await db.query(`
      SELECT
        id,
        code,
        name
      FROM public.inventory_item_types
      WHERE is_active = true
      ORDER BY name
    `, []);

    return NextResponse.json({ inventory_item_types: inventoryItemTypes.rows });
  } catch (error) {
    console.error('Error fetching inventory item types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

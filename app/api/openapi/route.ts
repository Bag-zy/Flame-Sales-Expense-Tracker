import { NextResponse } from 'next/server'
import { getSwaggerSpec } from '@/lib/swagger-static'

export const dynamic = 'force-dynamic';

export async function GET() {
  const spec = await getSwaggerSpec()
  return NextResponse.json(spec)
}

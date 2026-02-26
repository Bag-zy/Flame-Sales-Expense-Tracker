import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'

function toInt(value: any): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value || ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function toNum(value: any): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value || '0'))
  return Number.isFinite(n) ? n : 0
}

function generateSKU(itemName: string, variantValue?: string | null, nowMs?: number): string {
  const prefix = itemName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
  const variant = variantValue
    ? String(variantValue).substring(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
    : 'XX'
  const timestamp = String(nowMs ?? Date.now()).slice(-6)
  return `${prefix}-${variant}-${timestamp}`
}

async function assertProjectAccess(queryFn: (t: string, p?: any[]) => Promise<{ rows: any[] }>, user: any, projectId: number) {
  if (user.role === 'admin') return

  const access = await queryFn(
    `
    SELECT 1
      FROM project_assignments pa
     WHERE pa.project_id = $1 AND pa.user_id = $2
    UNION
    SELECT 1
      FROM project_assignments pa
      JOIN team_members tm ON tm.team_id = pa.team_id
     WHERE pa.project_id = $1 AND tm.user_id = $2
     LIMIT 1
    `,
    [projectId, user.id],
  )

  if (!access.rows.length) {
    throw new Error('Forbidden')
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeCode = searchParams.get('type_code')
    const projectId = toInt(searchParams.get('project_id'))
    const cycleId = toInt(searchParams.get('cycle_id'))

    if ((projectId && !cycleId) || (!projectId && cycleId)) {
      return NextResponse.json({ status: 'error', message: 'project_id and cycle_id must be provided together' }, { status: 400 })
    }

    if (projectId) {
      await assertProjectAccess(db.query, user, projectId)
    }

    const query = `
      WITH item_balances AS (
        SELECT 
          inventory_item_variant_id, 
          quantity_on_hand, 
          avg_unit_cost
        FROM inventory_balances
        WHERE organization_id = $1
          AND (project_id = $2 OR $2 IS NULL)
          AND (cycle_id = $3 OR $3 IS NULL)
      ),
      variant_data AS (
        SELECT 
          iv.*,
          ib.quantity_on_hand,
          ib.avg_unit_cost
        FROM inventory_item_variants iv
        LEFT JOIN item_balances ib ON ib.inventory_item_variant_id = iv.id
      ),
      item_variants AS (
        SELECT 
          inventory_item_id,
          json_agg(vd.* ORDER BY vd.id ASC) as variants
        FROM variant_data vd
        GROUP BY inventory_item_id
      )
      SELECT 
        ii.*,
        it.code AS type_code,
        it.name AS type_name,
        COALESCE(iv.variants, '[]'::json) as variants
      FROM inventory_items ii
      JOIN inventory_item_types it ON it.id = ii.inventory_item_type_id
      LEFT JOIN item_variants iv ON iv.inventory_item_id = ii.id
      WHERE ii.organization_id = $1
    `

    const params: any[] = [user.organizationId, projectId, cycleId]
    let filterIdx = 3
    let finalQuery = query

    if (typeCode) {
      filterIdx += 1
      finalQuery += ` AND it.code = $${filterIdx}`
      params.push(typeCode)
    }

    if (projectId) {
      filterIdx += 1
      finalQuery += ` AND (ii.project_id = $${filterIdx} OR ii.project_id IS NULL)`
      params.push(projectId)
    }

    finalQuery += ' ORDER BY ii.id DESC'

    const result = await db.query(finalQuery, params)
    return NextResponse.json({ status: 'success', items: result.rows || [] })
  } catch (error) {
    console.error('[Inventory API] GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory items'
    const status = message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ status: 'error', message }, { status })
  }
}

export async function POST(request: NextRequest) {
  let user: any = null;
  let body: any = {};
  try {
    user = await getApiOrSessionUser(request)
    const organizationId = Number(user?.organizationId || 0) || 0
    const userId = Number(user?.id || 0) || 0
    if (!organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    body = await request.json()

    const typeCode = typeof body.inventory_item_type_code === 'string' ? body.inventory_item_type_code : null
    const typeId = body.inventory_item_type_id === undefined ? null : toInt(body.inventory_item_type_id)
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!name) {
      return NextResponse.json({ status: 'error', message: 'name is required' }, { status: 400 })
    }

    const requestedSku = typeof body.sku === 'string' ? body.sku.trim() : ''
    const sku = requestedSku ? requestedSku : null
    const imageUrl = typeof body.image_url === 'string' ? body.image_url : null
    const uom = typeof body.uom === 'string' ? body.uom : null
    const isActive = body.is_active === undefined ? true : Boolean(body.is_active)
    const defaultPurchaseUnitCost = body.default_purchase_unit_cost == null ? null : (toNum(body.default_purchase_unit_cost) || null)
    const defaultSalePrice = body.default_sale_price == null ? null : (toNum(body.default_sale_price) || null)
    const description = typeof body.description === 'string' ? body.description : null

    const projectId = body.project_id == null ? null : toInt(body.project_id)
    const projectCategoryId = body.project_category_id == null ? null : (toInt(body.project_category_id) || null)

    const variantsRaw = Array.isArray(body.variants) ? body.variants : []
    const variants = variantsRaw
      .map((v: any) => ({
        label: typeof v.label === 'string' ? (v.label.trim() || null) : null,
        sku: typeof v.sku === 'string' ? (v.sku.trim() || null) : null,
        is_active: v.is_active === undefined ? true : Boolean(v.is_active),
        unit_cost: v.unit_cost == null ? null : (toNum(v.unit_cost) || null),
        selling_price: v.selling_price == null ? null : (toNum(v.selling_price) || null),
        quantity: v.quantity == null ? 0 : (toNum(v.quantity) || 0),
      }))
      .filter((v: any) => v.label || v.sku || v.unit_cost != null || v.selling_price != null || v.quantity > 0)

    for (const v of variants) {
      if (!v.label) {
        return NextResponse.json({ status: 'error', message: 'variant label is required' }, { status: 400 })
      }
    }

    const result = await db.transaction(async (tx) => {
      let resolvedTypeId: number | null = typeId
      let resolvedTypeCode: string | null = typeCode

      if (!resolvedTypeId && typeCode) {
        const t = await tx.query('SELECT id, code FROM inventory_item_types WHERE code = $1 LIMIT 1', [typeCode])
        resolvedTypeId = t.rows[0]?.id ?? null
        resolvedTypeCode = t.rows[0]?.code ?? typeCode
      }

      if (resolvedTypeId && !resolvedTypeCode) {
        const t = await tx.query('SELECT code FROM inventory_item_types WHERE id = $1 LIMIT 1', [resolvedTypeId])
        resolvedTypeCode = t.rows[0]?.code ?? null
      }

      if (!resolvedTypeId) {
        throw new Error('inventory_item_type_id or inventory_item_type_code is required')
      }

      // 1. Advisory Lock: Prevent race conditions for concurrent requests with same name
      // This ensures that two requests for the same organization and item name are handled sequentially.
      await tx.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [organizationId, name]);

      // 2. Idempotency check: check if an item with the same name already exists
      const existingCheck = await tx.query(
        `SELECT id 
           FROM inventory_items 
          WHERE organization_id = $1 
            AND name = $2 
            AND inventory_item_type_id = $3
            AND (project_id = $4 OR ($4 IS NULL AND project_id IS NULL))
          LIMIT 1`,
        [organizationId, name, resolvedTypeId, projectId]
      )

      if (existingCheck.rows.length > 0) {
        console.log(`[Inventory API] Existing item found for "${name}", returning ID: ${existingCheck.rows[0].id}`);
        const existingId = existingCheck.rows[0].id
        const itemRes = await tx.query('SELECT * FROM inventory_items WHERE id = $1', [existingId])
        const variantsRes = await tx.query('SELECT * FROM inventory_item_variants WHERE inventory_item_id = $1 ORDER BY id ASC', [existingId])
        return {
          item: {
            ...itemRes.rows[0],
            variants: variantsRes.rows
          }
        }
      }

      if (projectId) {
        await assertProjectAccess(tx.query, user, projectId)
      }

      if (resolvedTypeCode === 'FINISHED_GOODS' && !projectId) {
        return { item: null as any }
      }

      const nowBase = Date.now()
      const itemSku = sku || generateSKU(name, variants[0]?.label || null, nowBase)

      const ins = await tx.query(
        `
        INSERT INTO inventory_items (
          organization_id,
          inventory_item_type_id,
          project_id,
          project_category_id,
          name,
          sku,
          image_url,
          uom,
          is_active,
          default_purchase_unit_cost,
          default_sale_price,
          description,
          created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING *
        `,
        [
          organizationId,
          resolvedTypeId,
          projectId,
          projectCategoryId,
          name,
          itemSku,
          imageUrl,
          uom,
          isActive,
          defaultPurchaseUnitCost,
          defaultSalePrice,
          description,
          userId,
        ],
      )

      const item = ins.rows[0]

      if (!item) {
        return { item: null as any } as const
      }

      if (variants.length > 0) {
        for (let idx = 0; idx < variants.length; idx += 1) {
          const v = variants[idx]
          const vSku = v.sku || generateSKU(name, v.label, nowBase + idx + 1)
          const vRes = await tx.query(
            `
            INSERT INTO inventory_item_variants (
              inventory_item_id,
              label,
              sku,
              is_active,
              unit_cost,
              selling_price
            ) VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING id
            `,
            [item.id, v.label, vSku, v.is_active, v.unit_cost, v.selling_price],
          )
          const variantId = vRes.rows[0]?.id

          // Create opening balance transaction if quantity > 0
          if (variantId && v.quantity > 0) {
            if (!projectId) {
              throw new Error('Project is required to add opening stock')
            }

            // Create transaction
            await tx.query(
              `
              INSERT INTO inventory_item_transactions (
                organization_id,
                project_id,
                cycle_id,
                inventory_item_id,
                inventory_item_variant_id,
                transaction_type,
                quantity_delta,
                unit_cost,
                source_type,
                source_id,
                notes,
                created_by
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
              `,
              [
                organizationId,
                projectId,
                body.cycle_id || null,
                item.id,
                variantId,
                'OPENING_BALANCE',
                v.quantity,
                v.unit_cost,
                'inventory_item',
                item.id,
                'Initial stock from item creation',
                userId,
              ],
            )

            // Update inventory balance
            if (body.cycle_id) {
              await tx.query(
                `
                INSERT INTO inventory_balances (
                  organization_id,
                  project_id,
                  cycle_id,
                  inventory_item_variant_id,
                  quantity_on_hand,
                  avg_unit_cost
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (organization_id, project_id, cycle_id, inventory_item_variant_id)
                DO UPDATE SET
                  quantity_on_hand = inventory_balances.quantity_on_hand + EXCLUDED.quantity_on_hand,
                  avg_unit_cost = CASE
                    WHEN inventory_balances.quantity_on_hand + EXCLUDED.quantity_on_hand > 0
                    THEN (
                      (inventory_balances.quantity_on_hand * COALESCE(inventory_balances.avg_unit_cost, 0) +
                       EXCLUDED.quantity_on_hand * COALESCE(EXCLUDED.avg_unit_cost, 0)) /
                      (inventory_balances.quantity_on_hand + EXCLUDED.quantity_on_hand)
                    )
                    ELSE inventory_balances.avg_unit_cost
                  END,
                  updated_at = NOW()
                `,
                [organizationId, projectId, body.cycle_id, variantId, v.quantity, v.unit_cost]
              )
            }
          }
        }
      } else {
        await tx.query(
          `
          INSERT INTO inventory_item_variants (
            inventory_item_id,
            label,
            sku,
            is_active,
            unit_cost,
            selling_price
          ) VALUES ($1,'Default',$2,true,$3,$4)
          `,
          [item.id, itemSku, defaultPurchaseUnitCost, defaultSalePrice],
        )
      }

      const vres = await tx.query('SELECT * FROM inventory_item_variants WHERE inventory_item_id = $1 ORDER BY id ASC', [item.id])

      return { item: { ...item, variants: vres.rows || [] } } as const
    })

    if (!result || (result as any).item === null) {
      return NextResponse.json({ status: 'error', message: 'project_id is required for FINISHED_GOODS' }, { status: 400 })
    }

    return NextResponse.json({ status: 'success', item: (result as any).item })
  } catch (error: any) {
    if (error.code === '23505') {
      // Deep fallback if pre-check somehow missed it
      const organizationId = Number(user?.organizationId || 0) || 0;
      const projectId = toInt(body.project_id);
      const name = typeof body.name === 'string' ? body.name.trim() : '';

      const existing = await db.query(
        `SELECT i.* FROM inventory_items i 
         WHERE i.organization_id = $1 AND i.name = $2
         AND (i.inventory_item_type_id = $3 OR $3 IS NULL)
         AND (i.project_id = $4 OR ($4 IS NULL AND i.project_id IS NULL))
         LIMIT 1`,
        [organizationId, name, toInt(body.inventory_item_type_id), projectId]
      )
      if (existing.rows.length > 0) {
        const item = existing.rows[0]
        const vres = await db.query('SELECT * FROM inventory_item_variants WHERE inventory_item_id = $1 ORDER BY id ASC', [item.id])
        return NextResponse.json({ status: 'success', item: { ...item, variants: vres.rows || [] } })
      }
    }

    console.error('[Inventory API] POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create inventory item'
    const status = message === 'Forbidden' ? 403 : ((message.includes('Project is required') || message.includes('name is required')) ? 400 : 500)
    return NextResponse.json({ status: 'error', message }, { status })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = toInt(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'id is required' }, { status: 400 })
    }

    // Check if item exists and belongs to user's organization
    const itemCheck = await db.query(
      'SELECT project_id FROM inventory_items WHERE id = $1 AND organization_id = $2',
      [id, user.organizationId]
    )

    if (!itemCheck.rows.length) {
      return NextResponse.json({ status: 'error', message: 'Item not found' }, { status: 404 })
    }

    const projectId = itemCheck.rows[0]?.project_id
    if (projectId) {
      await assertProjectAccess(db.query, user, projectId)
    }

    // Delete the item (variants will be cascade deleted)
    await db.query('DELETE FROM inventory_items WHERE id = $1 AND organization_id = $2', [id, user.organizationId])

    return NextResponse.json({ status: 'success', message: 'Item deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete inventory item'
    const status = message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ status: 'error', message }, { status })
  }
}

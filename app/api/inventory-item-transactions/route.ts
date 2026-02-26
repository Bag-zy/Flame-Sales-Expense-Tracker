import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { postInventoryV2MovementByVariantId } from '@/lib/inventory-v2'
import { assertCycleNotInventoryLocked, isCycleInventoryLockedError } from '@/lib/cycle-inventory-lock'

export async function POST(request: NextRequest) {
    try {
        const user = await getApiOrSessionUser(request)
        if (!user?.organizationId) {
            return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
        }

        const { organizationId, id: userId } = user
        const body = await request.json()

        const {
            inventory_item_variant_id,
            project_id,
            cycle_id,
            transaction_type,
            quantity_delta,
            unit_cost,
            notes,
        } = body

        if (!inventory_item_variant_id || !project_id || !cycle_id || !transaction_type || quantity_delta === undefined) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 })
        }

        await assertCycleNotInventoryLocked(db.query, cycle_id, organizationId)

        await postInventoryV2MovementByVariantId(db.query, {
            organizationId,
            projectId: project_id,
            cycleId: cycle_id,
            inventoryItemVariantId: inventory_item_variant_id,
            quantityDelta: quantity_delta,
            unitCost: unit_cost || null,
            transactionType: transaction_type,
            notes: notes || null,
            createdBy: userId,
            sourceType: 'manual',
        })

        return NextResponse.json({ status: 'success', message: 'Transaction recorded' })
    } catch (error) {
        if (isCycleInventoryLockedError(error)) {
            return NextResponse.json({ status: 'error', message: error.message }, { status: 409 })
        }
        console.error('Inventory item transactions POST error:', error)
        return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : 'Internal error' }, { status: 500 })
    }
}

'use client'

import { useMemo, useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

import { useFilter } from '@/lib/context/filter-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogFooter } from '@/components/ui/dialog'

type InventoryItemTypeCode = 'RAW_MATERIAL' | 'WORK_IN_PROGRESS' | 'FINISHED_GOODS'

type VariantFormRow = {
  label: string
  sku: string
  unit_cost: string
  selling_price: string
  quantity: string
  is_active: boolean
}

function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function createEmptyVariant(): VariantFormRow {
  return {
    label: '',
    sku: '',
    unit_cost: '',
    selling_price: '',
    quantity: '',
    is_active: true,
  }
}

export function InventoryItemV2Form(props: {
  typeCode: InventoryItemTypeCode
  projectId?: number | null
  cycleId?: number | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const { typeCode, projectId: propsProjectId, cycleId: propsCycleId, onSuccess, onCancel } = props

  const { selectedProject, selectedCycle, projects, currentCurrencyCode } = useFilter() as any

  const labels = useMemo(() => {
    if (typeCode === 'RAW_MATERIAL') {
      return {
        title: 'Create Raw Material',
        name: 'Material Name *',
        showSellingPrice: false,
        salePriceLabel: 'Sale Price',
        purchaseCostLabel: 'Purchase Unit Cost',
      }
    }

    if (typeCode === 'WORK_IN_PROGRESS') {
      return {
        title: 'Create Work In Progress Item',
        name: 'WIP Item Name *',
        showSellingPrice: false,
        salePriceLabel: 'Sale Price',
        purchaseCostLabel: 'Unit Cost',
      }
    }

    return {
      title: 'Create Finished Good',
      name: 'Product Name *',
      showSellingPrice: true,
      salePriceLabel: 'Selling Price',
      purchaseCostLabel: 'Unit Cost',
    }
  }, [typeCode])

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [uom, setUom] = useState('')
  const [defaultSalePrice, setDefaultSalePrice] = useState('')
  const [variants, setVariants] = useState<VariantFormRow[]>([createEmptyVariant()])
  const [submitting, setSubmitting] = useState(false)

  // Use ref to prevent double-submission in React StrictMode
  const isSubmittingRef = useRef(false)

  // Use props if provided, otherwise fall back to context
  const effectiveProjectId = propsProjectId !== undefined
    ? propsProjectId
    : (selectedProject ? (parseInt(String(selectedProject), 10) || null) : null)

  const effectiveCycleId = propsCycleId !== undefined
    ? propsCycleId
    : (selectedCycle ? (parseInt(String(selectedCycle), 10) || null) : null)

  const selectedProjectObj = Array.isArray(projects)
    ? projects.find((p: any) => Number(p?.id) === Number(effectiveProjectId))
    : null

  const handleAddVariant = () => {
    setVariants((prev) => [...prev, createEmptyVariant()])
  }

  const handleRemoveVariant = (idx: number) => {
    setVariants((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  const handleUpdateVariant = (idx: number, field: keyof VariantFormRow, value: any) => {
    setVariants((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  const handleSubmit = async () => {
    // Double-submission guard
    if (submitting || isSubmittingRef.current) return

    isSubmittingRef.current = true
    setSubmitting(true)

    if (!name.trim()) {
      toast.error('Name is required')
      isSubmittingRef.current = false
      setSubmitting(false)
      return
    }

    if (typeCode === 'FINISHED_GOODS' && !effectiveProjectId) {
      toast.error('Please select a project before creating a finished good')
      isSubmittingRef.current = false
      setSubmitting(false)
      return
    }

    const cleanedVariants = (variants || []).map((v) => ({
      label: (v.label || '').trim(),
      sku: (v.sku || '').trim(),
      unit_cost: (v.unit_cost || '').trim(),
      selling_price: (v.selling_price || '').trim(),
      quantity: (v.quantity || '').trim(),
      is_active: v.is_active,
    }))

    if (!cleanedVariants.length) {
      toast.error('At least one variant is required')
      isSubmittingRef.current = false
      setSubmitting(false)
      return
    }

    for (let i = 0; i < cleanedVariants.length; i += 1) {
      if (!cleanedVariants[i].label) {
        toast.error(`Variant ${i + 1} label is required`)
        isSubmittingRef.current = false
        setSubmitting(false)
        return
      }
    }

    // Check if any variant has quantity > 0 and warn if no project/cycle selected
    const hasQuantity = cleanedVariants.some((v) => toNumOrNull(v.quantity) && toNumOrNull(v.quantity)! > 0)
    if (hasQuantity && !effectiveProjectId) {
      toast.error('Please select a project to add opening stock quantities')
      isSubmittingRef.current = false
      setSubmitting(false)
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        inventory_item_type_code: typeCode,
        name: name.trim(),
        sku: sku.trim() || null,
        uom: uom.trim() || null,
        default_sale_price: labels.showSellingPrice ? toNumOrNull(defaultSalePrice) : null,
        project_id: typeCode === 'FINISHED_GOODS' ? effectiveProjectId : (effectiveProjectId || null),
        cycle_id: effectiveCycleId || null,
        project_category_id: typeCode === 'FINISHED_GOODS' ? (selectedProjectObj?.project_category_id ?? null) : null,
        variants: cleanedVariants.map((v) => ({
          label: v.label,
          sku: v.sku || null,
          is_active: v.is_active,
          unit_cost: toNumOrNull(v.unit_cost),
          selling_price: labels.showSellingPrice ? toNumOrNull(v.selling_price) : null,
          quantity: toNumOrNull(v.quantity),
        })),
      }

      const res = await fetch('/api/v1/inventory-items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to create inventory item')
      }

      toast.success('Inventory item created')

      // Call onSuccess only once
      // Note: we don't reset 'submitting' here because we want to stay disabled while closing
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create inventory item')
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{labels.name}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>SKU</Label>
          <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Leave blank to auto-generate" />
        </div>

        <div className="space-y-2">
          <Label>UOM</Label>
          <Input value={uom} onChange={(e) => setUom(e.target.value)} />
        </div>

        {labels.showSellingPrice ? (
          <div className="space-y-2">
            <Label>{currentCurrencyCode ? `${labels.salePriceLabel} (${currentCurrencyCode})` : labels.salePriceLabel}</Label>
            <Input
              type="number"
              step="0.0001"
              value={defaultSalePrice}
              onChange={(e) => setDefaultSalePrice(e.target.value)}
              placeholder={currentCurrencyCode ? `Enter amount in ${currentCurrencyCode}` : 'Enter amount'}
            />
          </div>
        ) : null}
      </div>

      {!effectiveProjectId && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Select a project and cycle to add opening stock quantities. You can create the item now and add stock later.
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Variants</div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
          <Plus className="w-4 h-4 mr-2" />
          Add Variant
        </Button>
      </div>

      <div className="space-y-3">
        {variants.map((v, idx) => (
          <div key={idx} className="rounded-md border border-border p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{v.label?.trim() ? v.label : `Variant ${idx + 1}`}</div>
              {variants.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveVariant(idx)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variant Label *</Label>
                <Input value={v.label} onChange={(e) => handleUpdateVariant(idx, 'label', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Variant SKU</Label>
                <Input
                  value={v.sku}
                  onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div className="space-y-2">
                <Label>{currentCurrencyCode ? `Unit Cost (${currentCurrencyCode})` : 'Unit Cost'}</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={v.unit_cost}
                  onChange={(e) => handleUpdateVariant(idx, 'unit_cost', e.target.value)}
                  placeholder={currentCurrencyCode ? `Enter cost in ${currentCurrencyCode}` : 'Enter cost'}
                />
              </div>

              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={v.quantity}
                  onChange={(e) => handleUpdateVariant(idx, 'quantity', e.target.value)}
                  placeholder="0"
                />
              </div>

              {labels.showSellingPrice ? (
                <div className="space-y-2">
                  <Label>{currentCurrencyCode ? `Selling Price (${currentCurrencyCode})` : 'Selling Price'}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={v.selling_price}
                    onChange={(e) => handleUpdateVariant(idx, 'selling_price', e.target.value)}
                    placeholder={currentCurrencyCode ? `Enter price in ${currentCurrencyCode}` : 'Enter price'}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </div>
  )
}

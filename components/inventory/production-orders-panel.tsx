'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowRight, BarChart3, Building2, Calendar, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react'

import { useFilter } from '@/lib/context/filter-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import { ProductionOrderDetails } from '@/components/inventory/production-order-details'

type VariantOption = {
  id: number
  label: string
  itemName: string
  typeCode: string
  quantityOnHand?: number
  unitCost?: number | null
}

type ProductionOrder = {
  id: number
  project_id: number
  cycle_id: number
  status: string
  output_inventory_item_variant_id: number
  output_quantity: number
  output_unit_cost: number | null
  notes: string | null
  created_at: string
  completed_at: string | null
  inputs: Array<{
    id: number
    input_inventory_item_variant_id: number
    quantity_required: number
    unit_cost_override: number | null
  }>
}

type InputRow = {
  rowId: string
  input_inventory_item_variant_id: string
  quantity_required: string
  unit_cost_override: string
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

export function ProductionOrdersPanel() {
  const { selectedProject, selectedCycle } = useFilter()

  const canUse = Boolean(selectedProject && selectedCycle)

  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const [outputVariantId, setOutputVariantId] = useState('')
  const [outputQty, setOutputQty] = useState('')
  const [inputs, setInputs] = useState<InputRow[]>([
    { rowId: uid(), input_inventory_item_variant_id: '', quantity_required: '', unit_cost_override: '' },
  ])

  const variantById = useMemo(() => {
    const m = new Map<number, VariantOption>()
    for (const v of variantOptions) m.set(v.id, v)
    return m
  }, [variantOptions])

  const loadOrders = async () => {
    if (!canUse) {
      setOrders([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const url = new URL('/api/v1/production-orders', window.location.origin)
      url.searchParams.set('project_id', selectedProject)
      url.searchParams.set('cycle_id', selectedCycle)

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to load production orders')
      }
      setOrders((data.orders || []) as ProductionOrder[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load production orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const loadVariants = async () => {
    if (!canUse) {
      setVariantOptions([])
      return
    }

    try {
      const url = new URL('/api/v1/inventory-items', window.location.origin)
      url.searchParams.set('project_id', selectedProject)
      url.searchParams.set('cycle_id', selectedCycle)

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to load inventory variants')
      }

      const outMap = new Map<string, VariantOption>()
      for (const item of data.items || []) {
        for (const v of item.variants || []) {
          const label = v.label || v.sku || `#${v.id}`
          const key = `${item.name.toLowerCase()} / ${label.toLowerCase()}`
          if (!outMap.has(key)) {
            outMap.set(key, {
              id: Number(v.id),
              label: label,
              itemName: item.name,
              typeCode: item.type_code,
              quantityOnHand: Number(v.quantity_on_hand || 0),
              unitCost: v.avg_unit_cost != null ? Number(v.avg_unit_cost) : (v.unit_cost != null ? Number(v.unit_cost) : null),
            })
          }
        }
      }
      setVariantOptions(Array.from(outMap.values()))
    } catch (e) {
      setVariantOptions([])
    }
  }

  useEffect(() => {
    loadOrders()
    loadVariants()
  }, [selectedProject, selectedCycle])

  const createOrder = async () => {
    if (!canUse) {
      toast.error('Select a project and cycle first')
      return
    }

    const outputId = parseInt(outputVariantId || '0', 10) || 0
    const outQty = parseInt(outputQty || '0', 10) || 0

    if (!outputId) {
      toast.error('Select an output item')
      return
    }
    if (!outQty) {
      toast.error('Output quantity is required')
      return
    }

    const cleanInputs = inputs
      .map((r) => ({
        input_inventory_item_variant_id: parseInt(r.input_inventory_item_variant_id || '0', 10) || null,
        quantity_required: parseInt(r.quantity_required || '0', 10) || 0,
        unit_cost_override: toNumOrNull(r.unit_cost_override),
      }))
      .filter((r) => r.input_inventory_item_variant_id && r.quantity_required > 0)

    if (cleanInputs.length === 0) {
      toast.error('Add at least one input line')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/v1/production-orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          project_id: parseInt(selectedProject, 10),
          cycle_id: parseInt(selectedCycle, 10),
          output_inventory_item_variant_id: outputId,
          output_quantity: outQty,
          inputs: cleanInputs,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to create production order')
      }

      toast.success('Production order created')
      setShowCreate(false)
      setOutputVariantId('')
      setOutputQty('')
      setInputs([{ rowId: uid(), input_inventory_item_variant_id: '', quantity_required: '', unit_cost_override: '' }])
      await loadOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create production order')
    } finally {
      setCreating(false)
    }
  }

  const completeOrder = async (id: number) => {
    if (!confirm('Complete this production order? This will post inventory movements.')) return

    try {
      const res = await fetch('/api/v1/production-orders', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status: 'COMPLETED' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to complete production order')
      }
      toast.success('Production order completed')
      await loadOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete production order')
    }
  }

  const deleteOrder = async (id: number) => {
    if (!confirm('Delete this production order?')) return

    try {
      const url = new URL('/api/v1/production-orders', window.location.origin)
      url.searchParams.set('id', String(id))

      const res = await fetch(url.toString(), { method: 'DELETE' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to delete production order')
      }
      toast.success('Production order deleted')
      await loadOrders()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete production order')
    }
  }

  if (selectedOrderId) {
    const order = orders.find(o => o.id === selectedOrderId)
    if (order) {
      return (
        <ProductionOrderDetails
          order={order}
          onBack={() => setSelectedOrderId(null)}
          onComplete={completeOrder}
          onDelete={deleteOrder}
          variantById={variantById as any}
        />
      )
    }
  }

  return (
    <div className="space-y-6">
      {!canUse ? (
        <Card>
          <CardHeader>
            <CardTitle>Production Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Select a project and cycle to manage production orders.</div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Production Orders</h2>
              <p className="text-sm text-muted-foreground">Manage and track your manufacturing assembly process.</p>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Production Order
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse bg-muted/50 h-48" />
              ))
            ) : orders.length === 0 ? (
              <div className="col-span-full bg-card rounded-lg border border-dashed p-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">No production orders yet for this cycle.</p>
              </div>
            ) : (
              orders.map((o) => {
                const outOpt = variantById.get(Number(o.output_inventory_item_variant_id))
                const outLabel = outOpt ? outOpt.label : 'Default'
                const outItem = outOpt ? outOpt.itemName : `Item #${o.output_inventory_item_variant_id}`

                const isCompleted = String(o.status) === 'COMPLETED'

                return (
                  <Card key={o.id} className="group hover:shadow-md transition-all border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order #{o.id}</span>
                          <CardTitle className="text-lg font-bold truncate max-w-[180px]">{outItem}</CardTitle>
                          <CardDescription className="flex items-center text-xs">
                            <Clock className="w-3 h-3 mr-1 opacity-60" />
                            {new Date(o.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={isCompleted ? "default" : "secondary"}
                          className={isCompleted ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                        >
                          {String(o.status || 'DRAFT').replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <div className="p-3 bg-muted/40 rounded-lg space-y-2 border border-border/50">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Variant</span>
                          <span className="font-semibold">{outLabel}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground font-medium">Output Qty</span>
                          <span className="text-sm font-black text-primary">
                            {Number(o.output_quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(o.id)} className="flex-1 text-xs">
                        View Details
                      </Button>
                      {!isCompleted && (
                        <Button variant="default" size="sm" onClick={() => completeOrder(o.id)} className="px-3 bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteOrder(o.id)} className="px-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Production Order</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Output Item Variant</Label>
              <Select value={outputVariantId} onValueChange={setOutputVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select output" />
                </SelectTrigger>
                <SelectContent>
                  {variantOptions
                    .filter((v) => v.typeCode === 'WORK_IN_PROGRESS' || v.typeCode === 'FINISHED_GOODS')
                    .map((v) => (
                      <SelectItem key={String(v.id)} value={String(v.id)}>
                        {v.itemName} / {v.label} ({v.typeCode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Output Quantity</Label>
              <Input type="number" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Inputs</Label>
            <div className="space-y-3">
              {inputs.map((r) => (
                <div key={r.rowId} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6">
                    <Select
                      value={r.input_inventory_item_variant_id}
                      onValueChange={(v) => {
                        const opt = variantById.get(Number(v))
                        setInputs((prev) =>
                          prev.map((x) =>
                            x.rowId === r.rowId
                              ? {
                                ...x,
                                input_inventory_item_variant_id: v,
                                unit_cost_override: opt?.unitCost != null ? String(opt.unitCost) : x.unit_cost_override,
                              }
                              : x,
                          ),
                        )
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select input" />
                      </SelectTrigger>
                      <SelectContent>
                        {variantOptions
                          .filter((v) => v.typeCode === 'RAW_MATERIAL' || v.typeCode === 'WORK_IN_PROGRESS')
                          .map((v) => (
                            <SelectItem key={String(v.id)} value={String(v.id)}>
                              {v.itemName} / {v.label} ({v.typeCode})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {r.input_inventory_item_variant_id && (
                      <div className="text-[10px] text-muted-foreground mt-1 px-1">
                        In stock: <span className="font-bold text-foreground">{(variantById.get(Number(r.input_inventory_item_variant_id))?.quantityOnHand ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={r.quantity_required}
                      onChange={(e) =>
                        setInputs((prev) => prev.map((x) => (x.rowId === r.rowId ? { ...x, quantity_required: e.target.value } : x)))
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Unit cost (optional)"
                      value={r.unit_cost_override}
                      onChange={(e) =>
                        setInputs((prev) => prev.map((x) => (x.rowId === r.rowId ? { ...x, unit_cost_override: e.target.value } : x)))
                      }
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setInputs((prev) => prev.filter((x) => x.rowId !== r.rowId))}
                      disabled={inputs.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  setInputs((prev) => [
                    ...prev,
                    { rowId: uid(), input_inventory_item_variant_id: '', quantity_required: '', unit_cost_override: '' },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add input
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="button" onClick={createOrder} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, Plus, Trash2 } from 'lucide-react'

import { useFilter } from '@/lib/context/filter-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import { InventoryItemV2Form } from '@/components/inventory/inventory-item-v2-form'
import { InventoryItemDetails } from '@/components/inventory/inventory-item-details'

type InventoryItemTypeCode = 'RAW_MATERIAL' | 'WORK_IN_PROGRESS' | 'FINISHED_GOODS'

type InventoryItemVariant = {
  id: number
  inventory_item_id: number
  label: string | null
  sku: string | null
  is_active: boolean
  unit_cost: number | null
  selling_price: number | null
  quantity_on_hand?: number
  avg_unit_cost?: number | null
}

type InventoryItem = {
  id: number
  name: string
  sku: string | null
  uom: string | null
  is_active: boolean
  type_code: InventoryItemTypeCode
  variants: InventoryItemVariant[]
}

export function InventoryItemsPanel({ lockedTypeCode }: { lockedTypeCode?: InventoryItemTypeCode } = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedProject, selectedCycle, projects, currentCurrencyCode } = useFilter() as any

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<InventoryItemTypeCode>(lockedTypeCode ?? 'RAW_MATERIAL')
  const effectiveTypeFilter: InventoryItemTypeCode = lockedTypeCode ?? typeFilter

  const [showCreate, setShowCreate] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const hasBalances = Boolean(selectedProject && selectedCycle)

  const loadItems = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/v1/inventory-items', window.location.origin)
      url.searchParams.set('type_code', effectiveTypeFilter)
      if (selectedProject && selectedCycle) {
        url.searchParams.set('project_id', selectedProject)
        url.searchParams.set('cycle_id', selectedCycle)
      }

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to load inventory items')
      }
      setItems((data.items || []) as InventoryItem[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load inventory items')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [effectiveTypeFilter, selectedProject, selectedCycle])

  useEffect(() => {
    if (lockedTypeCode) {
      setTypeFilter(lockedTypeCode)
    }
  }, [lockedTypeCode])

  useEffect(() => {
    if (searchParams.get('action') === 'add-inventory') {
      setShowCreate(true)

      // Clean up the URL so that refreshing/navigating doesn't keep popping the modal open
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('action')
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    }
  }, [searchParams, router])

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return items
    return items.filter(
      it =>
        it.name.toLowerCase().includes(term) ||
        (it.sku && it.sku.toLowerCase().includes(term))
    )
  }, [items, searchTerm])

  const projectNameById = useMemo(() => {
    const m = new Map<number, string>()
    if (Array.isArray(projects)) {
      for (const p of projects) m.set(p.id, p.project_name)
    }
    return m
  }, [projects])

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this inventory item? This will delete all variants and cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/v1/inventory-items?id=${itemId}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to delete item')
      }

      toast.success('Item deleted successfully')
      await loadItems()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete item')
    }
  }

  if (selectedItem) {
    const project = (projects as any[])?.find((p: any) => p.id.toString() === selectedProject);

    return (
      <InventoryItemDetails
        item={selectedItem as any}
        projectName={project?.project_name}
        cycleName={selectedCycle ? `Cycle #${selectedCycle}` : undefined}
        onBack={() => setSelectedItem(null)}
        onEdit={() => {
          // Future: Open edit form
          toast.info('Edit functionality coming soon');
        }}
        onDelete={() => {
          handleDeleteItem(selectedItem.id);
          setSelectedItem(null);
        }}
        currencyLabel={currentCurrencyCode}
        hasBalances={hasBalances}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!lockedTypeCode ? (
            <div className="w-[200px]">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as InventoryItemTypeCode)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAW_MATERIAL">Raw Materials</SelectItem>
                  <SelectItem value="WORK_IN_PROGRESS">Work In Progress</SelectItem>
                  <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="w-[250px]">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={() => {
            setShowCreate(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">Loading items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-dashed rounded-lg">
            {searchTerm ? 'No items match your search.' : 'No items found. Click "Add Item" to create one.'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const totalQty = (item.variants || []).reduce((sum, v) => sum + (v.quantity_on_hand || 0), 0)
            // Use item.project_id if it exists, otherwise use context's selectedProject for display if needed
            // Actually items in the list response usually have project_id
            const projectName = (item as any).project_id ? (projectNameById.get((item as any).project_id) || 'Unknown') : 'N/A'

            return (
              <Card key={item.id} className="flex flex-col h-full hover:border-primary/50 transition-colors">
                <CardHeader className="space-y-2 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold line-clamp-1">{item.name}</CardTitle>
                      {item.sku && (
                        <CardDescription className="font-mono text-xs truncate">
                          SKU: {item.sku}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.variants?.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {item.variants.length} variant{item.variants.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {!lockedTypeCode && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {item.type_code.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pb-4 flex-grow">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project:</span>
                      <span className="font-medium truncate ml-2 text-right">{projectName}</span>
                    </div>
                    {hasBalances && (
                      <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md mt-1">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Stock:</span>
                        <span className="font-bold text-primary">
                          {totalQty.toLocaleString()} {item.uom || ''}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-0 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setSelectedItem(item)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    View
                  </Button>
                </CardFooter>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Inventory Item</DialogTitle>
          </DialogHeader>

          <InventoryItemV2Form
            typeCode={effectiveTypeFilter}
            projectId={selectedProject ? parseInt(selectedProject, 10) : null}
            cycleId={selectedCycle ? parseInt(selectedCycle, 10) : null}
            onSuccess={async () => {
              setShowCreate(false)
              await loadItems()
            }}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Building2, Edit, Package, Plus, Tag } from 'lucide-react'

import { useFilter } from '@/lib/context/filter-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { ProductForm } from '@/components/forms/product-form'
import { InventoryLogPanel } from '@/components/inventory/inventory-log-panel'
import { InventoryItemDetails } from '@/components/inventory/inventory-item-details'

interface VariantAttribute {
  type: string
  value: string
  unit: string
}

interface ProductVariant {
  id: number
  product_id: number
  label?: string
  sku?: string
  unit_cost?: number
  selling_price?: number
  quantity_in_stock: number
  unit_of_measurement?: string
  images?: string[]
  attributes?: VariantAttribute[]
}

interface Product {
  id: number
  inventory_item_id?: number
  product_name: string
  description?: string
  sku?: string
  unit_cost?: number
  selling_price?: number
  quantity_in_stock: number
  reorder_level: number
  project_id?: number
  cycle_id?: number
  variants?: ProductVariant[]
}

type V2BalanceByProductVariantId = Map<
  number,
  { inventory_item_variant_id: number; quantity_on_hand: number; avg_unit_cost: number | null }
>

const INVENTORY_PURCHASE_CATEGORY_NAME = 'Product/ Inventory / Stock Purchases'

export function FinishedGoodsPanel() {
  const { selectedProject, selectedCycle, projects, currentCurrencyCode } = useFilter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null)

  const [balancesByProductVariantId, setBalancesByProductVariantId] = useState<V2BalanceByProductVariantId>(new Map())

  const [expenseCategories, setExpenseCategories] = useState<Array<{ id: number; category_name: string }>>([])

  const [showStockDialog, setShowStockDialog] = useState(false)
  const [stockMode, setStockMode] = useState<'purchase' | 'adjust'>('purchase')
  const [stockVariantId, setStockVariantId] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockUnitCost, setStockUnitCost] = useState('')
  const [stockSellingPrice, setStockSellingPrice] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [isSavingStock, setIsSavingStock] = useState(false)

  const [logVariantId, setLogVariantId] = useState<number | null>(null)

  const purchaseCategoryId = useMemo(() => {
    const found = expenseCategories.find((c) => c.category_name === INVENTORY_PURCHASE_CATEGORY_NAME)
    return found?.id ?? null
  }, [expenseCategories])

  const projectNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of projects) m.set(p.id, p.project_name)
    return m
  }, [projects])

  const loadProducts = async () => {
    setLoading(true)
    try {
      if (!selectedProject || !selectedCycle) {
        setProducts([])
        setLoading(false)
        return
      }

      const url = new URL('/api/v1/products', window.location.origin)
      url.searchParams.set('project_id', selectedProject)
      url.searchParams.set('cycle_id', selectedCycle)

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to load products')
      }
      setProducts((data.products || []) as Product[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const loadExpenseCategories = async (projectId: string | null) => {
    try {
      const url = new URL('/api/v1/expense-categories', window.location.origin)
      if (projectId) url.searchParams.set('projectId', projectId)
      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (data?.status === 'success') {
        setExpenseCategories((data.categories || []) as any[])
      } else {
        setExpenseCategories([])
      }
    } catch {
      setExpenseCategories([])
    }
  }

  const loadV2Balances = async () => {
    if (!selectedProject || !selectedCycle) {
      setBalancesByProductVariantId(new Map())
      return
    }

    try {
      const url = new URL('/api/v1/inventory-items', window.location.origin)
      url.searchParams.set('type_code', 'FINISHED_GOODS')
      url.searchParams.set('project_id', selectedProject)
      url.searchParams.set('cycle_id', selectedCycle)

      const res = await fetch(url.toString(), { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!data || data.status !== 'success') {
        setBalancesByProductVariantId(new Map())
        return
      }

      const map: V2BalanceByProductVariantId = new Map()
      for (const item of data.items || []) {
        for (const v of item.variants || []) {
          // Use the primary variant ID (v.id) as the key, as this is what's 
          // returned by the products API and used for lookups in the UI.
          const variantId = Number(v.id || 0)
          if (!variantId) continue

          map.set(variantId, {
            inventory_item_variant_id: variantId,
            quantity_on_hand: Number(v.quantity_on_hand ?? 0) || 0,
            avg_unit_cost: v.avg_unit_cost == null ? null : (Number(v.avg_unit_cost) || null),
          })
        }
      }

      setBalancesByProductVariantId(map)
    } catch {
      setBalancesByProductVariantId(new Map())
    }
  }

  useEffect(() => {
    loadProducts()
  }, [selectedProject, selectedCycle])

  useEffect(() => {
    loadV2Balances()
  }, [selectedProject, selectedCycle])

  useEffect(() => {
    loadExpenseCategories(selectedProject || null)
  }, [selectedProject])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const matchesSearch = normalizedSearch
        ? (p.product_name || '').toLowerCase().includes(normalizedSearch) || (p.sku || '').toLowerCase().includes(normalizedSearch)
        : true
      return matchesSearch
    })
  }, [products, normalizedSearch])

  const openDetails = (p: Product) => {
    setDetailsProduct(p)
  }

  const handleDeleteProduct = async (p: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${p.product_name}"?`)) {
      return
    }

    try {
      // If it has an inventory_item_id, we can technically use either API, 
      // but let's stick to the product API for Finished Goods to ensure 
      // both V1 and V2 tables are handled according to the product routes.
      const res = await fetch(`/api/v1/products?id=${p.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.status === 'success') {
        toast.success('Product deleted successfully')
        setDetailsProduct(null)
        loadProducts()
      } else {
        toast.error(data.message || 'Failed to delete product')
      }
    } catch (error) {
      toast.error('Failed to delete product')
    }
  }

  const openStockDialog = (mode: 'purchase' | 'adjust', p: Product) => {
    setDetailsProduct(p)
    setStockMode(mode)
    setShowStockDialog(true)
    setStockVariantId('')
    setStockQuantity('')
    setStockUnitCost('')
    setStockSellingPrice('')
    setStockNotes('')
  }

  const handleSaveStock = async () => {
    const product = detailsProduct
    if (!product) return

    const qty = parseInt(stockQuantity || '0', 10) || 0
    if (qty <= 0) {
      toast.error('Enter a quantity greater than 0')
      return
    }

    if (!selectedProject || !selectedCycle) {
      toast.error('Please select a project and cycle from the top navigation first.')
      return
    }

    if (!stockVariantId) {
      toast.error('Please select a variant')
      return
    }

    if (stockMode === 'purchase') {
      const unitCost = parseFloat(stockUnitCost || '0') || 0
      if (unitCost <= 0) {
        toast.error('Enter a unit cost greater than 0')
        return
      }

      if (!purchaseCategoryId) {
        toast.error(`Missing expense category: ${INVENTORY_PURCHASE_CATEGORY_NAME}`)
        return
      }
    }

    try {
      setIsSavingStock(true)

      const variant = product.variants?.find((v) => v.id === parseInt(stockVariantId, 10))
      const payload: any = {
        type: stockMode === 'purchase' ? 'PURCHASE' : 'ADJUSTMENT_IN',
        project_id: parseInt(selectedProject, 10),
        cycle_id: parseInt(selectedCycle, 10),
        product_id: product.id,
        variant_id: parseInt(stockVariantId, 10),
        quantity: qty,
        notes: stockNotes || null,
      }

      if (stockMode === 'purchase') {
        payload.create_expense = true
        payload.expense_category_id = purchaseCategoryId
        payload.expense_name = variant?.label
          ? `Stock Purchase - ${product.product_name} (${variant.label})`
          : `Stock Purchase - ${product.product_name}`
        payload.unit_cost = parseFloat(stockUnitCost || '0') || 0
        payload.update_variant_unit_cost = parseFloat(stockUnitCost || '0') || null
        payload.update_variant_selling_price = stockSellingPrice.trim() === '' ? null : (parseFloat(stockSellingPrice) || null)
        payload.expense_date = new Date().toISOString()
      } else {
        payload.create_expense = false
      }

      const response = await fetch('/api/v1/inventory-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data || data.status !== 'success') {
        throw new Error(data?.message || 'Failed to update stock')
      }

      toast.success(stockMode === 'purchase' ? 'Stock purchase recorded' : 'Stock adjusted')
      setShowStockDialog(false)
      await loadProducts()
      await loadV2Balances()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update stock')
    } finally {
      setIsSavingStock(false)
    }
  }

  return (
    <div className="space-y-4">
      {detailsProduct ? (
        <InventoryItemDetails
          item={{
            id: detailsProduct.inventory_item_id || detailsProduct.id,
            name: detailsProduct.product_name,
            sku: detailsProduct.sku || null,
            uom: detailsProduct.variants?.[0]?.unit_of_measurement || 'units',
            description: detailsProduct.description || null,
            type_code: 'FINISHED_GOODS',
            type_name: 'Product / Finished Good',
            default_purchase_unit_cost: detailsProduct.unit_cost || null,
            default_sale_price: detailsProduct.selling_price || null,
            is_active: true,
            created_at: new Date().toISOString(),
            variants: (detailsProduct.variants || []).map(v => {
              const b = balancesByProductVariantId.get(v.id)
              return {
                id: b ? b.inventory_item_variant_id : v.id,
                label: v.label || 'Default',
                sku: v.sku || detailsProduct.sku || null,
                unit_cost: v.unit_cost || null,
                selling_price: v.selling_price || null,
                is_active: true,
                quantity_on_hand: b ? b.quantity_on_hand : 0,
                avg_unit_cost: b ? b.avg_unit_cost : null
              }
            })
          } as any}
          projectName={projects.find((p: any) => p.id.toString() === selectedProject)?.project_name}
          cycleName={selectedCycle ? `Cycle #${selectedCycle}` : undefined}
          onBack={() => setDetailsProduct(null)}
          onRefresh={() => loadV2Balances()}
          onEdit={() => {
            setEditingProduct(detailsProduct)
            setShowForm(true)
          }}
          onDelete={() => handleDeleteProduct(detailsProduct)}
          currencyLabel={currentCurrencyCode}
          hasBalances={true}
        />
      ) : !selectedProject || !selectedCycle ? (
        <div className="text-sm text-muted-foreground text-center py-12 bg-card rounded-lg border border-dashed">
          Select a project and cycle to view products.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-sm text-muted-foreground">Loading products...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full md:w-72">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name or SKU"
                className="bg-card"
              />
            </div>

            <Button
              onClick={() => {
                if (!selectedProject) {
                  toast.error('Please select a project before creating a product')
                  return
                }
                if (!selectedCycle) {
                  toast.error('Please select a cycle before creating a product')
                  return
                }
                setEditingProduct(null)
                setShowForm(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product / Finished Good
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const projectName = p.project_id ? (projectNameById.get(p.project_id) || 'Unknown') : 'N/A'

              const variants = Array.isArray(p.variants) ? p.variants : []
              const totalQtyV2 = variants.reduce((sum, v) => {
                const b = balancesByProductVariantId.get(v.id)
                return sum + (b ? b.quantity_on_hand : 0)
              }, 0)

              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg font-bold truncate">{p.product_name}</CardTitle>
                      {variants.length > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full uppercase tracking-wider">
                          {variants.length} Var
                        </span>
                      ) : null}
                    </div>
                    {p.sku ? (
                      <div className="flex items-center text-[10px] text-muted-foreground font-mono">
                        <Tag className="w-3 h-3 mr-1" /> {p.sku}
                      </div>
                    ) : null}
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3 mr-1.5 opacity-70" /> {projectName}
                      </div>
                      <div className="flex items-center text-sm font-medium">
                        <Package className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                        On hand: <span className="ml-1 text-primary font-bold">{Number(totalQtyV2).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Button variant="outline" onClick={() => openDetails(p)} className="w-full text-xs h-9">
                      View Product
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}

            {filteredProducts.length === 0 ? (
              <div className="col-span-full bg-card rounded-lg border border-dashed p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <p className="text-muted-foreground">No products found matching your search.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product / Finished Good' : 'Add Product / Finished Good'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            editingProduct={editingProduct}
            selectedProject={selectedProject}
            selectedCycle={selectedCycle}
            projects={projects}
            onSuccess={() => {
              setShowForm(false)
              setEditingProduct(null)
              loadProducts()
              loadV2Balances()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditingProduct(null)
            }}
          />
        </DialogContent>
      </Dialog>


      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{stockMode === 'purchase' ? 'Add Stock (Purchase)' : 'Adjust Stock'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={stockVariantId} onValueChange={setStockVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {(detailsProduct?.variants || []).map((v) => (
                    <SelectItem key={String(v.id)} value={String(v.id)}>
                      {v.label || 'Default variant'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
            </div>

            {stockMode === 'purchase' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Unit Cost</Label>
                  <Input type="number" step="0.01" min={0} value={stockUnitCost} onChange={(e) => setStockUnitCost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input type="number" step="0.01" min={0} value={stockSellingPrice} onChange={(e) => setStockSellingPrice(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockDialog(false)} disabled={isSavingStock}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} disabled={isSavingStock}>
              {isSavingStock ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client';

import { useState, useMemo } from 'react';
import { Package, Tag, DollarSign, TrendingUp, TrendingDown, Boxes, Calendar, Building2, Repeat, Plus, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { InventoryLogPanel } from './inventory-log-panel';
import { useFilter } from '@/lib/context/filter-context';

export interface InventoryItemVariant {
    id: number;
    label: string;
    sku: string | null;
    unit_cost: number | null;
    selling_price: number | null;
    is_active: boolean;
    quantity_on_hand?: number;
    avg_unit_cost?: number | null;
}

export interface InventoryItem {
    id: number;
    name: string;
    sku: string | null;
    uom: string | null;
    description?: string | null;
    type_code: string;
    type_name?: string;
    default_purchase_unit_cost?: number | null;
    default_sale_price?: number | null;
    is_active: boolean;
    created_at: string;
    variants: InventoryItemVariant[];
}

export interface InventoryItemDetailsProps {
    item: InventoryItem;
    projectName?: string;
    cycleName?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    onBack?: () => void;
    onRefresh?: () => void;
    currencyLabel?: string;
    hasBalances?: boolean;
}

export function InventoryItemDetails({
    item,
    projectName,
    cycleName,
    onEdit,
    onDelete,
    onBack,
    onRefresh,
    currencyLabel = '',
    hasBalances = false,
}: InventoryItemDetailsProps) {
    const { selectedProject, selectedCycle } = useFilter();

    const [showStockDialog, setShowStockDialog] = useState(false);
    const [stockMode, setStockMode] = useState<'purchase' | 'adjust'>('purchase');
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
    const [selectedVariantId, setSelectedVariantId] = useState<string>('');
    const [stockQuantity, setStockQuantity] = useState('');
    const [stockUnitCost, setStockUnitCost] = useState('');
    const [stockNotes, setStockNotes] = useState('');
    const [isSavingStock, setIsSavingStock] = useState(false);
    const [logVariantId, setLogVariantId] = useState<number | null>(null);

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return 'N/A';
        if (currencyLabel) {
            return `${currencyLabel} ${Number(amount).toLocaleString()}`;
        }
        return Number(amount).toLocaleString();
    };

    const totalQuantity = useMemo(() => {
        if (!hasBalances) return null;
        return item.variants.reduce((sum, v) => sum + (v.quantity_on_hand || 0), 0);
    }, [item.variants, hasBalances]);

    const totalValue = useMemo(() => {
        if (!hasBalances) return null;
        return item.variants.reduce((sum, v) => {
            const qty = v.quantity_on_hand || 0;
            const cost = v.avg_unit_cost || v.unit_cost || 0;
            return sum + (qty * cost);
        }, 0);
    }, [item.variants, hasBalances]);

    const typeLabel = item.type_name || item.type_code?.replace(/_/g, ' ') || 'Unknown';
    const getTypeColor = () => {
        switch (item.type_code) {
            case 'RAW_MATERIAL':
                return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
            case 'WORK_IN_PROGRESS':
                return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
            case 'FINISHED_GOODS':
                return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
            default:
                return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
        }
    };

    const selectedVariant = useMemo(() => {
        return item.variants.find(v => v.id.toString() === selectedVariantId) || null;
    }, [item.variants, selectedVariantId]);

    const handleSaveStock = async () => {
        if (!selectedVariantId) {
            toast.error('Select a variant');
            return;
        }
        const qty = parseFloat(stockQuantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error('Enter a valid quantity');
            return;
        }

        if (!selectedProject || !selectedCycle) {
            toast.error('Project and cycle required');
            return;
        }

        try {
            setIsSavingStock(true);
            const payload = {
                inventory_item_id: item.id,
                inventory_item_variant_id: parseInt(selectedVariantId),
                project_id: parseInt(selectedProject),
                cycle_id: parseInt(selectedCycle),
                transaction_type: stockMode === 'purchase' ? 'PURCHASE' : (adjustmentType === 'add' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'),
                quantity_delta: adjustmentType === 'add' ? qty : -qty,
                unit_cost: stockMode === 'purchase' ? parseFloat(stockUnitCost) : (selectedVariant?.avg_unit_cost || selectedVariant?.unit_cost),
                notes: stockNotes || null,
                organization_id: (item as any).organization_id // Assuming organization_id is present or handled by API
            };

            const res = await fetch('/api/v1/inventory-item-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || data?.status !== 'success') {
                throw new Error(data?.message || 'Failed to update stock');
            }

            toast.success('Stock updated successfully');
            setShowStockDialog(false);

            if (onRefresh) {
                await onRefresh();
            }

            // If we don't have a refresh or specifically want to go back, we can.
            // But usually after a successful save, staying on the page with refreshed data is better,
            // or going back if that's the preferred UX. 
            // For consistency with current behavior, we'll keep the back navigation.
            if (onBack) onBack();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to update stock');
        } finally {
            setIsSavingStock(false);
        }
    };

    const openStockDialog = (mode: 'purchase' | 'adjust', variantId?: number) => {
        setStockMode(mode);
        setAdjustmentType('add');
        setSelectedVariantId(variantId ? variantId.toString() : (item.variants.length === 1 ? item.variants[0].id.toString() : ''));
        setStockQuantity('');
        setStockUnitCost(variantId ? (item.variants.find(v => v.id === variantId)?.unit_cost?.toString() || '') : '');
        setStockNotes('');
        setShowStockDialog(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{item.name}</h1>
                            <Badge className={getTypeColor()}>
                                {typeLabel}
                            </Badge>
                            <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                {item.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        {item.sku && (
                            <p className="text-sm text-muted-foreground">
                                SKU: {item.sku}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openStockDialog('adjust')}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Adjust Stock
                    </Button>
                    <Button size="sm" onClick={() => openStockDialog('purchase')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stock
                    </Button>
                    {onBack && (
                        <Button variant="outline" onClick={onBack}>
                            Back
                        </Button>
                    )}
                    {onEdit && (
                        <Button variant="outline" onClick={onEdit}>
                            Edit
                        </Button>
                    )}
                    {onDelete && (
                        <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            {hasBalances && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                        <CardContent className="py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Quantity</p>
                                    <p className="text-3xl font-bold text-blue-600">
                                        {totalQuantity?.toLocaleString() || 0} {item.uom || ''}
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                                    <Boxes className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
                        <CardContent className="py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Value</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {formatCurrency(totalValue)}
                                    </p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                                    <DollarSign className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Pricing & Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Default Pricing (Promoted to top) */}
                {(item.default_purchase_unit_cost !== null || item.default_sale_price !== null) && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Default Pricing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {item.default_purchase_unit_cost !== null && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3" /> Purchase Cost
                                        </p>
                                        <p className="text-lg font-bold">{formatCurrency(item.default_purchase_unit_cost)}</p>
                                    </div>
                                )}
                                {item.default_sale_price !== null && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" /> Sale Price
                                        </p>
                                        <p className="text-lg font-bold">{formatCurrency(item.default_sale_price)}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Merged Item Information */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Item Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Tag className="h-3 w-3" /> UOM
                                </p>
                                <p className="text-sm font-semibold truncate">{item.uom || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Created
                                </p>
                                <p className="text-sm font-semibold truncate">{new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                            {projectName && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Building2 className="h-3 w-3" /> Project
                                    </p>
                                    <p className="text-sm font-semibold truncate">{projectName}</p>
                                </div>
                            )}
                            {cycleName && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <Repeat className="h-3 w-3" /> Cycle
                                    </p>
                                    <p className="text-sm font-semibold truncate">{cycleName}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Description */}
            {item.description && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{item.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Variants */}
            <Card>
                <CardHeader>
                    <CardTitle>Variants</CardTitle>
                    <CardDescription>{item.variants.length} variant{item.variants.length !== 1 ? 's' : ''} available</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Label</th>
                                    <th className="px-4 py-2 text-left font-semibold">SKU</th>
                                    <th className="px-4 py-2 text-right font-semibold">Unit Cost</th>
                                    {item.type_code === 'FINISHED_GOODS' && (
                                        <th className="px-4 py-2 text-right font-semibold">Selling Price</th>
                                    )}
                                    {hasBalances && (
                                        <>
                                            <th className="px-4 py-2 text-right font-semibold">On Hand</th>
                                            <th className="px-4 py-2 text-right font-semibold">Avg Cost</th>
                                            <th className="px-4 py-2 text-right font-semibold">Value</th>
                                        </>
                                    )}
                                    <th className="px-4 py-2 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {item.variants.map((variant) => {
                                    const variantValue = hasBalances
                                        ? (variant.quantity_on_hand || 0) * (variant.avg_unit_cost || variant.unit_cost || 0)
                                        : null;

                                    return (
                                        <tr key={variant.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-2 whitespace-nowrap font-medium">{variant.label}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                                                {variant.sku || '—'}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right">
                                                {formatCurrency(variant.unit_cost)}
                                            </td>
                                            {item.type_code === 'FINISHED_GOODS' && (
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                    {formatCurrency(variant.selling_price)}
                                                </td>
                                            )}
                                            {hasBalances && (
                                                <>
                                                    <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                                                        {(variant.quantity_on_hand || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-right">
                                                        {formatCurrency(variant.avg_unit_cost)}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-right font-medium">
                                                        {formatCurrency(variantValue)}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-4 py-2 text-center space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setLogVariantId(variant.id)}
                                                    className={logVariantId === variant.id ? 'bg-primary/10 text-primary' : ''}
                                                >
                                                    <History className="w-4 h-4" />
                                                </Button>
                                                <Badge variant={variant.is_active ? 'default' : 'secondary'} className="text-xs">
                                                    {variant.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Stock History */}
            {logVariantId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Variant History</CardTitle>
                        <CardDescription>
                            Recent stock movements for {item.variants.find(v => v.id === logVariantId)?.label || 'selected variant'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <InventoryLogPanel inventoryItemVariantId={logVariantId} />
                    </CardContent>
                </Card>
            )}


            {/* Stock Management Dialog */}
            <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{stockMode === 'purchase' ? 'Add Stock (Purchase)' : 'Adjust Stock'}</DialogTitle>
                        <DialogDescription>
                            Record a stock movement for {item.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {stockMode === 'adjust' && (
                            <div className="flex justify-center gap-2 p-1 bg-muted rounded-lg">
                                <Button
                                    type="button"
                                    variant={adjustmentType === 'add' ? 'default' : 'ghost'}
                                    className="flex-1"
                                    onClick={() => setAdjustmentType('add')}
                                >
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Add Stock
                                </Button>
                                <Button
                                    type="button"
                                    variant={adjustmentType === 'subtract' ? 'destructive' : 'ghost'}
                                    className="flex-1"
                                    onClick={() => setAdjustmentType('subtract')}
                                >
                                    <TrendingDown className="w-4 h-4 mr-2" />
                                    Remove Stock
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="variant" className="text-right">Variant</Label>
                            <div className="col-span-3">
                                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select variant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {item.variants.map(v => (
                                            <SelectItem key={v.id} value={v.id.toString()}>
                                                {v.label} {v.sku ? `(${v.sku})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedVariant && hasBalances && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <div className="text-right text-sm text-muted-foreground">Current Stock</div>
                                <div className="col-span-3 text-sm font-semibold">
                                    {(selectedVariant.quantity_on_hand || 0).toLocaleString()} {item.uom || 'units'}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="quantity" className="text-right">
                                {adjustmentType === 'add' ? 'Add Qty' : 'Remove Qty'}
                            </Label>
                            <Input
                                id="quantity"
                                type="number"
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(e.target.value)}
                                placeholder={`Number of ${item.uom || 'units'}`}
                                className="col-span-3"
                            />
                        </div>

                        {stockMode === 'purchase' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit_cost" className="text-right">Unit Cost {currencyLabel ? `(${currencyLabel})` : ''}</Label>
                                <Input
                                    id="unit_cost"
                                    type="number"
                                    step="0.01"
                                    value={stockUnitCost}
                                    onChange={(e) => setStockUnitCost(e.target.value)}
                                    placeholder="Cost per unit"
                                    className="col-span-3"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="notes" className="text-right">Notes</Label>
                            <Input
                                id="notes"
                                value={stockNotes}
                                onChange={(e) => setStockNotes(e.target.value)}
                                placeholder="Optional notes"
                                className="col-span-3"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStockDialog(false)} disabled={isSavingStock}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveStock} disabled={isSavingStock}>
                            {isSavingStock ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

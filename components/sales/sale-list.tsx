'use client';

import { useMemo, useState } from 'react';
import { ShoppingCart, Calendar, Package, User, DollarSign, Plus, Search, Trash2, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export interface Sale {
  id: number;
  project_id?: number;
  product_id?: number;
  variant_id?: number;
  customer: string;
  customer_name?: string;
  customerName?: string;
  quantity: number;
  unit_cost: number;
  price: number;
  status: string;
  date: string;
  cycle_id?: number;
  cash_at_hand?: number;
  balance?: number;
  sale_date?: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

export const statusOptions: Record<SaleStatus | string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', icon: <Clock className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
  refunded: { label: 'Refunded', color: 'bg-muted text-foreground', icon: <RotateCcw className="h-3 w-3" /> },
};

export interface SaleCardProps {
  sale: Sale;
  productName?: string;
  onEdit?: (sale: Sale) => void;
  onDelete?: (sale: Sale) => void;
  onView?: (sale: Sale) => void;
  currencyLabel?: string;
}

export function SaleCard({
  sale,
  productName,
  onEdit,
  onDelete,
  onView,
  currencyLabel = '',
}: SaleCardProps) {
  const totalSale = sale.quantity * sale.price;
  const profit = sale.quantity * (sale.price - sale.unit_cost);
  const customer = sale.customer || sale.customer_name || sale.customerName || 'N/A';
  
  const statusConfig = statusOptions[sale.status] || { 
    label: sale.status, 
    color: 'bg-muted text-foreground',
    icon: null
  };

  const formattedTotal = currencyLabel
    ? `${currencyLabel} ${totalSale.toLocaleString()}`
    : totalSale.toLocaleString();

  const formattedProfit = currencyLabel
    ? `${currencyLabel} ${profit.toLocaleString()}`
    : profit.toLocaleString();

  const dateStr = sale.sale_date || sale.date;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900/20">
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{customer}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <Badge className={`${statusConfig.color} flex items-center gap-1`}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">{productName || 'Unknown Product'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">Qty: {sale.quantity}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-green-600">{formattedTotal}</p>
            <p className="text-xs text-muted-foreground">Profit: {formattedProfit}</p>
          </div>
          <div className="flex gap-2">
            {onView && (
              <Button variant="ghost" size="sm" onClick={() => onView(sale)}>
                View
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(sale)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(sale)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface SaleListProps {
  sales: Sale[];
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  onView: (sale: Sale) => void;
  onAddNew: () => void;
  onBulkDelete?: (ids: number[]) => void;
  isLoading?: boolean;
  getProductName?: (sale: Sale) => string;
  currencyLabel?: string;
}

export function SaleList({
  sales,
  onEdit,
  onDelete,
  onView,
  onAddNew,
  onBulkDelete,
  isLoading = false,
  getProductName,
  currencyLabel = '',
}: SaleListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    return sales.filter(
      (s) =>
        (s.customer?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (getProductName?.(s)?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [sales, searchTerm, getProductName]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSales.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSales.map((s) => s.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onBulkDelete?.(selectedIds);
    setSelectedIds([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-lg border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-b animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Sales ({sales.length})</h2>
        </div>
        <div className="flex gap-2">
          {onBulkDelete && selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Sale
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search sales..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredSales.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No sales found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new sale'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Sale
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {onBulkDelete && (
                    <th className="px-4 py-3 text-left w-10">
                      <Checkbox
                        checked={
                          selectedIds.length > 0 && selectedIds.length === filteredSales.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Profit</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSales.map((sale) => {
                  const totalSale = sale.quantity * sale.price;
                  const profit = sale.quantity * (sale.price - sale.unit_cost);
                  const statusConfig = statusOptions[sale.status] || { 
                    label: sale.status, 
                    color: 'bg-muted text-foreground',
                    icon: null
                  };
                  const dateStr = sale.sale_date || sale.date;

                  return (
                    <tr key={sale.id} className="hover:bg-muted/50">
                      {onBulkDelete && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Checkbox
                            checked={selectedIds.includes(sale.id)}
                            onCheckedChange={() => toggleSelect(sale.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {sale.customer || sale.customer_name || sale.customerName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {getProductName?.(sale) || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{sale.quantity}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-green-600">
                        {currencyLabel
                          ? `${currencyLabel} ${totalSale.toLocaleString()}`
                          : totalSale.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {currencyLabel
                          ? `${currencyLabel} ${profit.toLocaleString()}`
                          : profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onView(sale)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onEdit(sale)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(sale)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

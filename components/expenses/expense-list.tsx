'use client';

import { useState, useMemo } from 'react';
import { Wallet, Calendar, Tag, Store, CreditCard, Building2, Repeat, Search, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export interface Expense {
  id: number;
  project_id?: number;
  cycle_id?: number;
  category_id?: number;
  vendor_id?: number;
  payment_method_id?: number;
  expense_name?: string;
  description: string;
  amount: number;
  date_time_created: string;
  created_by: number;
  created_at: string;
  product_id?: number | null;
  variant_id?: number | null;
  inventory_quantity?: number | null;
  inventory_unit_cost?: number | null;
}

export interface ExpenseCardProps {
  expense: Expense;
  projectName?: string;
  categoryName?: string;
  vendorName?: string;
  paymentMethodName?: string;
  cycleName?: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  onView?: (expense: Expense) => void;
  currencyLabel?: string;
}

export function ExpenseCard({
  expense,
  projectName,
  categoryName,
  vendorName,
  paymentMethodName,
  cycleName,
  onEdit,
  onDelete,
  onView,
  currencyLabel = '',
}: ExpenseCardProps) {
  const displayName = expense.expense_name || expense.description;
  const formattedAmount = currencyLabel
    ? `${currencyLabel} ${Number(expense.amount ?? 0).toFixed(2)}`
    : Number(expense.amount ?? 0).toFixed(2);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20">
              <Wallet className="h-4 w-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{displayName}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {new Date(expense.date_time_created).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-red-600">{formattedAmount}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {projectName && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{projectName}</span>
            </div>
          )}
          {categoryName && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{categoryName}</span>
            </div>
          )}
          {vendorName && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{vendorName}</span>
            </div>
          )}
          {paymentMethodName && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{paymentMethodName}</span>
            </div>
          )}
          {cycleName && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Repeat className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{cycleName}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(expense)}>
              View
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(expense)}
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onView: (expense: Expense) => void;
  onAddNew: () => void;
  onBulkDelete?: (ids: number[]) => void;
  isLoading?: boolean;
  getProjectName?: (id?: number) => string;
  getCategoryName?: (id?: number) => string;
  getVendorName?: (id?: number) => string;
  getPaymentMethodName?: (id?: number) => string;
  getCycleName?: (id?: number) => string;
  currencyLabel?: string;
}

export function ExpenseList({
  expenses,
  onEdit,
  onDelete,
  onView,
  onAddNew,
  onBulkDelete,
  isLoading = false,
  getProjectName,
  getCategoryName,
  getVendorName,
  getPaymentMethodName,
  getCycleName,
  currencyLabel = '',
}: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm) return expenses;
    return expenses.filter(
      (e) =>
        (e.expense_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (e.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (getCategoryName?.(e.category_id)?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (getVendorName?.(e.vendor_id)?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [expenses, searchTerm, getCategoryName, getVendorName]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map((e) => e.id));
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
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Expenses ({expenses.length})</h2>
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
            Add Expense
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No expenses found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new expense'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
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
                          selectedIds.length > 0 && selectedIds.length === filteredExpenses.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Project</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Expense</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Vendor</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/50">
                    {onBulkDelete && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Checkbox
                          checked={selectedIds.includes(expense.id)}
                          onCheckedChange={() => toggleSelect(expense.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(expense.date_time_created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getProjectName?.(expense.project_id) || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {expense.expense_name || expense.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {getCategoryName?.(expense.category_id) || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {getVendorName?.(expense.vendor_id) || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-red-600">
                      {currencyLabel
                        ? `${currencyLabel} ${Number(expense.amount ?? 0).toFixed(2)}`
                        : Number(expense.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onView(expense)}>
                          View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(expense)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

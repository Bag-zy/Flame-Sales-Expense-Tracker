'use client';

import { useMemo } from 'react';
import { Wallet, Calendar, Tag, Store, CreditCard, Building2, Repeat, FileText, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Expense } from './index';

export interface Receipt {
  id: number;
  expense_id?: number;
  file_path?: string;
  upload_date: string;
  raw_text?: string;
  structured_data?: any;
}

export interface ExpenseDetailsProps {
  expense: Expense;
  receipts?: Receipt[];
  projectName?: string;
  categoryName?: string;
  vendorName?: string;
  paymentMethodName?: string;
  cycleName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  currencyLabel?: string;
}

export function ExpenseDetails({
  expense,
  receipts = [],
  projectName,
  categoryName,
  vendorName,
  paymentMethodName,
  cycleName,
  onEdit,
  onDelete,
  onBack,
  currencyLabel = '',
}: ExpenseDetailsProps) {
  const displayName = expense.expense_name || expense.description;
  const formattedAmount = currencyLabel
    ? `${currencyLabel} ${Number(expense.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : Number(expense.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const hasInventory = expense.product_id || expense.variant_id;

  const receipt = receipts.length > 0 ? receipts[0] : receipts.find((r) => r.file_path);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
            <Wallet className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-900/10 text-red-600 border-red-200">
                Expense
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(expense.date_time_created).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Expense Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold text-red-600">{formattedAmount}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <Wallet className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {hasInventory && expense.inventory_quantity && (
              <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Inventory Implication</p>
                      <p className="text-3xl font-bold text-blue-600">
                        +{expense.inventory_quantity.toLocaleString()} units
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <Repeat className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Info Grid */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expense Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Project
                  </p>
                  <p className="text-sm font-semibold truncate">{projectName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Repeat className="h-3 w-3" /> Cycle
                  </p>
                  <p className="text-sm font-semibold truncate">{cycleName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Category
                  </p>
                  <p className="text-sm font-semibold truncate">{categoryName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Store className="h-3 w-3" /> Vendor
                  </p>
                  <p className="text-sm font-semibold truncate">{vendorName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Payment
                  </p>
                  <p className="text-sm font-semibold truncate">{paymentMethodName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Purchase Date
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {new Date(expense.date_time_created).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{expense.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {/* Inventory Linked */}
          {hasInventory && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Inventory Linked</CardTitle>
                <CardDescription>Stock adjustments from this purchase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Product ID:</span>
                  <span className="font-medium">#{expense.product_id}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Variant ID:</span>
                  <span className="font-medium">#{expense.variant_id}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{expense.inventory_quantity}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">Unit Cost:</span>
                  <span className="font-medium">
                    {currencyLabel
                      ? `${currencyLabel} ${Number(expense.inventory_unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : Number(expense.inventory_unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Receipt Image */}
        <div className="space-y-6">
          <Card className="h-full max-h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-4 w-4" />
                Receipt Image
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex items-center justify-center bg-muted/20 p-4">
              {receipt?.file_path ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receipt.file_path}
                    alt="Receipt"
                    className="max-w-full max-h-[600px] object-contain rounded-md shadow-sm"
                  />
                  <a
                    href={receipt.file_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background p-1.5 rounded-md shadow-sm border border-border transition-colors backdrop-blur-sm"
                    title="Open in new tab"
                  >
                    <FileText className="h-4 w-4" />
                  </a>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No receipt image available</p>
                </div>
              )}
            </CardContent>
            {receipts.length > 0 && (
              <div className="border-t p-4 bg-muted/10">
                <p className="text-xs font-medium text-muted-foreground mb-2">Attached Files ({receipts.length})</p>
                <div className="flex flex-wrap gap-2">
                  {receipts.map(r => (
                    <a key={r.id} href={r.file_path || '#'} target="_blank" rel="noopener noreferrer">
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        Receipt #{r.id}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

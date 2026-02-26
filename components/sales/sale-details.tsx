'use client';

import { useMemo } from 'react';
import { ShoppingCart, Calendar, Package, User, DollarSign, Building2, Repeat, CheckCircle, Clock, XCircle, RotateCcw, ArrowLeft, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sale, statusOptions } from './sale-list';

export interface SaleDetailsProps {
  sale: Sale;
  productName?: string;
  projectName?: string;
  cycleName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  currencyLabel?: string;
}

export function SaleDetails({
  sale,
  productName,
  projectName,
  cycleName,
  onEdit,
  onDelete,
  onBack,
  currencyLabel = '',
}: SaleDetailsProps) {
  const totalSale = sale.quantity * sale.price;
  const profit = sale.quantity * (sale.price - sale.unit_cost);
  const profitMargin = sale.price > 0 ? ((sale.price - sale.unit_cost) / sale.price) * 100 : 0;
  
  const customer = sale.customer || sale.customer_name || sale.customerName || 'N/A';
  const dateStr = sale.sale_date || sale.date;
  
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

  const formattedUnitPrice = currencyLabel
    ? `${currencyLabel} ${sale.price.toFixed(2)}`
    : sale.price.toFixed(2);

  const formattedUnitCost = currencyLabel
    ? `${currencyLabel} ${sale.unit_cost.toFixed(2)}`
    : sale.unit_cost.toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
            <ShoppingCart className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Sale #{sale.id}</h1>
              <Badge className={`${statusConfig.color} flex items-center gap-1`}>
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Project: {projectName || 'N/A'}
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

      {/* Total and Profit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sale</p>
                <p className="text-3xl font-bold text-green-600">{formattedTotal}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={profit >= 0 ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className={`text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formattedProfit}</p>
                <p className="text-xs text-muted-foreground mt-1">{profitMargin.toFixed(1)}% margin</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${profit >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                <TrendingUp className={`h-6 w-6 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{customer}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Product</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{productName || 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{projectName || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">{cycleName || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={`${statusConfig.color} text-sm`}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Details</CardTitle>
          <CardDescription>Breakdown of sale pricing and costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-sm">
              <div className="text-muted-foreground">Quantity</div>
              <div className="font-medium text-lg">{sale.quantity}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Unit Price</div>
              <div className="font-medium text-lg">{formattedUnitPrice}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Unit Cost</div>
              <div className="font-medium text-lg">{formattedUnitCost}</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">Created</div>
              <div className="font-medium text-lg">
                {new Date(sale.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {sale.cash_at_hand !== undefined && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm">
                  <div className="text-muted-foreground">Cash at Hand</div>
                  <div className="font-medium text-lg">
                    {currencyLabel
                      ? `${currencyLabel} ${Number(sale.cash_at_hand).toFixed(2)}`
                      : Number(sale.cash_at_hand).toFixed(2)}
                  </div>
                </div>
                {sale.balance !== undefined && (
                  <div className="text-sm">
                    <div className="text-muted-foreground">Balance</div>
                    <div className="font-medium text-lg">
                      {currencyLabel
                        ? `${currencyLabel} ${Number(sale.balance).toFixed(2)}`
                        : Number(sale.balance).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {sale.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

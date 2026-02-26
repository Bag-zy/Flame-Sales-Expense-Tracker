'use client';

import { useMemo, useState } from 'react';
import { FileText, Calendar, DollarSign, User, Plus, Search, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  net_amount?: number | null;
  vat_amount?: number | null;
  gross_amount?: number | null;
  status?: string | null;
  pdf_url?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'generated';

export const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-foreground' },
  generated: { label: 'Generated', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' },
};

export interface InvoiceCardProps {
  invoice: Invoice;
  onDownload?: (invoice: Invoice) => void;
  onView?: (invoice: Invoice) => void;
  defaultCurrency?: string;
}

export function InvoiceCard({
  invoice,
  onDownload,
  onView,
  defaultCurrency = 'USD',
}: InvoiceCardProps) {
  const total = invoice.gross_amount ?? invoice.net_amount ?? 0;
  const currency = invoice.currency || defaultCurrency;
  const status = invoice.status || 'generated';
  const statusConfig = invoiceStatusConfig[status] || { label: status, color: 'bg-muted text-foreground' };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/20">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{invoice.invoice_number}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {invoice.customer_name || 'No customer'}
              </p>
            </div>
          </div>
          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {invoice.invoice_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Inv: {new Date(invoice.invoice_date).toLocaleDateString()}</span>
            </div>
          )}
          {invoice.due_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(invoice)}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
          {onDownload && invoice.pdf_url && (
            <Button variant="ghost" size="sm" onClick={() => onDownload(invoice)}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface InvoiceListProps {
  invoices: Invoice[];
  onDownload: (invoice: Invoice) => void;
  onView: (invoice: Invoice) => void;
  onAddNew: () => void;
  isLoading?: boolean;
  defaultCurrency?: string;
  customers?: Array<{ id: number; name: string }>;
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
}

export function InvoiceList({
  invoices,
  onDownload,
  onView,
  onAddNew,
  isLoading = false,
  defaultCurrency = 'USD',
  customers = [],
  selectedCustomerId = '',
  onCustomerChange,
}: InvoiceListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    return invoices.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

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
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Invoices ({invoices.length})</h2>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {onCustomerChange && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => onCustomerChange(e.target.value)}
              className="w-56 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No invoices found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : 'Create your first invoice'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Invoice #</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Invoice Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Due Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInvoices.map((invoice) => {
                  const total = invoice.gross_amount ?? invoice.net_amount ?? 0;
                  const status = invoice.status || 'generated';
                  const statusConfig = invoiceStatusConfig[status] || { label: status, color: 'bg-muted text-foreground' };
                  return (
                    <tr key={invoice.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{invoice.invoice_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {invoice.customer_name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                        {invoice.currency || defaultCurrency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onView(invoice)}>
                            View
                          </Button>
                          {invoice.pdf_url && (
                            <Button variant="ghost" size="sm" onClick={() => onDownload(invoice)}>
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          )}
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

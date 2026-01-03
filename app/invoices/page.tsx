'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useFilter } from '@/lib/context/filter-context';
import { Customer } from '@/components/forms/customer-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateInvoiceForm } from '@/components/forms/invoice-form';

interface Invoice {
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

function InvoicesPageContent() {
  const { selectedProject, selectedCycle, selectedOrganization, organizations } = useFilter();
  const searchParams = useSearchParams();
  const currentOrg = organizations.find((org) => org.id.toString() === selectedOrganization);
  const orgCurrencyCode = currentOrg?.currency_code || 'USD';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [selectedProject, selectedCycle, selectedCustomerId]);

  useEffect(() => {
    const open = searchParams.get('open');
    if (open === 'invoice') {
      if (!selectedProject || !selectedCycle) {
        toast.error('Please select a project and a cycle from the main navigation first.');
      } else {
        setShowCreateDialog(true);
      }
    }
  }, [searchParams, selectedProject, selectedCycle]);

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/v1/customers');
      const data = await response.json();
      if (data.status === 'success') {
        setCustomers(data.customers || []);
      }
    } catch (error) {
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/v1/invoices', window.location.origin);
      if (selectedProject) url.searchParams.set('project_id', selectedProject);
      if (selectedCycle) url.searchParams.set('cycle_id', selectedCycle);
      if (selectedCustomerId) url.searchParams.set('customer_id', selectedCustomerId);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const formatAmount = (value?: number | null) => {
    if (value == null) return '-';
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleDownload = (invoice: Invoice) => {
    if (!invoice.pdf_url) return;
    window.open(invoice.pdf_url, '_blank');
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h1 className="text-3xl font-bold">Invoices</h1>
          <Button
            type="button"
            onClick={() => {
              if (!selectedProject || !selectedCycle) {
                toast.error('Please select a project and a cycle from the main navigation first.');
              } else {
                setShowCreateDialog(true);
              }
            }}
          >
            Create Invoice
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-end mt-2">
          <div>
            <label className="block text-sm font-medium text-foreground">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="mt-1 w-56 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 bg-card rounded-lg border border-border overflow-x-auto">
          {invoices.length > 0 ? (
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50 dark:bg-muted/80">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-foreground dark:text-foreground">Invoice #</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground dark:text-foreground">Customer</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground dark:text-foreground">Invoice Date</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground dark:text-foreground">Due Date</th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground dark:text-foreground">Total</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground dark:text-foreground">Status</th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground dark:text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 dark:divide-muted/60">
                {invoices.map((invoice) => {
                  const total = invoice.gross_amount ?? invoice.net_amount ?? 0;
                  return (
                    <tr key={invoice.id} className="hover:bg-muted/50 dark:hover:bg-muted/80">
                      <td className="px-4 py-2 whitespace-nowrap">{invoice.invoice_number}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{invoice.customer_name || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(invoice.invoice_date)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{formatDate(invoice.due_date)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        {invoice.currency || orgCurrencyCode} {formatAmount(total)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{invoice.status || 'generated'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        {invoice.pdf_url ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(invoice)}
                          >
                            Download PDF
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No PDF stored</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">No invoices found.</div>
          )}
        </div>
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => setShowCreateDialog(open)}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <CreateInvoiceForm
              customers={customers}
              defaultCurrency={orgCurrencyCode}
              onSuccess={() => {
                setShowCreateDialog(false);
                loadInvoices();
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

export default function InvoicesPage() {
  return <InvoicesPageContent />;
}

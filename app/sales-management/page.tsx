'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, FileText, Users, TrendingUp, DollarSign, User } from 'lucide-react';
import { useFilter } from '@/lib/context/filter-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import components
import { SaleList, Sale } from '@/components/sales';
import { InvoiceList, Invoice } from '@/components/invoices';
import { CustomerList, Customer } from '@/components/customers';

// Import forms
import { SaleForm } from '@/components/forms/sale-form';
import { InvoiceForm } from '@/components/forms/invoice-form';
import { CustomerForm } from '@/components/forms/customer-form';

export default function SalesManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedProject, selectedCycle, selectedOrganization, organizations, currentCurrencyCode } = useFilter();
  const [activeTab, setActiveTab] = useState('sales');

  // Get current organization currency
  const currentOrg = organizations.find((org) => org.id.toString() === selectedOrganization);
  const orgCurrencyCode = currentOrg?.currency_code || 'USD';
  const displayCurrency = currentCurrencyCode || orgCurrencyCode;

  // Data states
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Array<{
    id: number;
    product_id: number;
    product_name: string;
    label?: string;
    selling_price?: number;
    unit_cost?: number;
    quantity_in_stock: number;
    unit_of_measurement?: string;
  }>>([]);
  const [cycles, setCycles] = useState<Array<{ id: number; cycle_name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: number; project_name: string }>>([]);

  // Loading states
  const [loadingSales, setLoadingSales] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Modal states
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, [selectedProject, selectedCycle, selectedCustomerId]);

  // Handle URL actions for form opening
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-sale') {
      setShowSaleForm(true);
      setActiveTab('sales');
    } else if (action === 'create-invoice') {
      setActiveTab('invoices');
      if (!selectedProject || !selectedCycle) {
        toast.error('Please select a project and cycle first to create an invoice');
      } else {
        setShowInvoiceForm(true);
      }
    } else if (action === 'add-customer') {
      setShowCustomerForm(true);
      setActiveTab('customers');
    }
  }, [searchParams, selectedProject, selectedCycle]);

  const loadAllData = async () => {
    await Promise.all([
      loadSales(),
      loadInvoices(),
      loadCustomers(),
      loadProducts(),
      loadCycles(),
      loadProjects(),
    ]);
  };

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const url = new URL('/api/v1/sales', window.location.origin);
      url.searchParams.set('limit', '5000');
      if (selectedProject) url.searchParams.set('project_id', selectedProject);
      if (selectedCycle) url.searchParams.set('cycle_id', selectedCycle);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        setSales(data.sales || []);
      }
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoadingSales(false);
    }
  };

  const loadInvoices = async () => {
    setLoadingInvoices(true);
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
      toast.error('Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch('/api/v1/customers');
      const data = await response.json();
      if (data.status === 'success') {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadProducts = async () => {
    try {
      const url = new URL('/api/v1/products', window.location.origin);
      url.searchParams.set('include_variants', 'true');
      if (selectedProject) url.searchParams.set('project_id', selectedProject);
      if (selectedCycle) url.searchParams.set('cycle_id', selectedCycle);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        const rawProducts = data.products || [];
        const flattenedVariants: any[] = [];

        rawProducts.forEach((p: any) => {
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              flattenedVariants.push({
                id: v.id,
                product_id: p.id,
                product_name: p.product_name,
                label: v.label,
                selling_price: v.selling_price,
                unit_cost: v.unit_cost,
                quantity_in_stock: v.quantity_in_stock,
                unit_of_measurement: v.unit_of_measurement,
              });
            });
          } else {
            // Fallback for Products without variants (shouldn't happen with V2)
            flattenedVariants.push({
              id: p.id, // Potentially conflicting if p.id overlaps v.id space, but okay for display
              product_id: p.id,
              product_name: p.product_name,
              label: 'Default',
              selling_price: p.selling_price,
              unit_cost: p.unit_cost,
              quantity_in_stock: p.quantity_in_stock,
              unit_of_measurement: p.unit_of_measurement,
            });
          }
        });

        setProducts(flattenedVariants);
      }
    } catch (error) {
      // Silent fail for products
    }
  };

  const loadCycles = async () => {
    try {
      const url = new URL('/api/v1/cycles', window.location.origin);
      if (selectedProject) url.searchParams.set('project_id', selectedProject);
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        setCycles(data.cycles || []);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/v1/projects');
      const data = await response.json();
      if (data.status === 'success') {
        setProjects(data.projects || []);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Sale handlers
  const handleSaleView = (sale: Sale) => {
    router.push(`/sales/${sale.id}`);
  };

  const handleSaleEdit = (sale: Sale) => {
    setEditingSale(sale);
    setShowSaleForm(true);
  };

  const handleSaleDelete = async (sale: Sale) => {
    if (!confirm(`Delete this sale?`)) return;
    try {
      const response = await fetch(`/api/v1/sales?id=${sale.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Sale deleted');
        loadSales();
        loadProducts();
      }
    } catch (error) {
      toast.error('Failed to delete sale');
    }
  };

  const handleSaleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Delete ${ids.length} sales?`)) return;
    toast.info('Bulk delete not implemented yet');
  };

  const getProductName = (sale: Sale) => {
    const productId = sale.product_id;
    if (!productId) return 'Unknown';
    // lookup by product_id since products array is now flattened variants
    return products.find(p => p.product_id === productId)?.product_name || 'Unknown';
  };

  // Invoice handlers
  const handleInvoiceDownload = (invoice: Invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  const handleInvoiceView = (invoice: Invoice) => {
    // Could navigate to invoice details if available
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    }
  };

  // Customer handlers
  const handleCustomerView = (customer: Customer) => {
    router.push(`/customers/${customer.id}`);
  };

  const handleCustomerEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const handleCustomerDelete = async (customer: Customer) => {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      const response = await fetch(`/api/v1/customers?id=${customer.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Customer deleted');
        loadCustomers();
      }
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  const handleCustomerBulkDelete = async (ids: number[]) => {
    if (!confirm(`Delete ${ids.length} customers?`)) return;
    toast.info('Bulk delete not implemented yet');
  };

  // Summary calculations
  const totalSales = sales.reduce((sum, s) => sum + (s.quantity * s.price), 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + (i.gross_amount || i.net_amount || 0), 0);
  const completedSales = sales.filter(s => s.status === 'completed').length;

  return (
    <AuthGuard>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Sales Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage sales, invoices, and customers
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {displayCurrency} {totalSales.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {sales.length} sale{sales.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoice Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {displayCurrency} {totalInvoices.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-xs text-muted-foreground">
                Active customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedSales}</div>
              <p className="text-xs text-muted-foreground">
                {((completedSales / sales.length) * 100 || 0).toFixed(0)}% completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Sales</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Customers</span>
            </TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Sales
                </CardTitle>
                <CardDescription>
                  Track and manage all your sales transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SaleList
                  sales={sales}
                  onView={handleSaleView}
                  onEdit={handleSaleEdit}
                  onDelete={handleSaleDelete}
                  onAddNew={() => setShowSaleForm(true)}
                  onBulkDelete={handleSaleBulkDelete}
                  isLoading={loadingSales}
                  getProductName={getProductName}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoices
                </CardTitle>
                <CardDescription>
                  Manage invoices and download PDFs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceList
                  invoices={invoices}
                  onDownload={handleInvoiceDownload}
                  onView={handleInvoiceView}
                  onAddNew={() => {
                    if (!selectedProject || !selectedCycle) {
                      toast.error('Please select a project and cycle first');
                    } else {
                      setShowInvoiceForm(true);
                    }
                  }}
                  isLoading={loadingInvoices}
                  defaultCurrency={displayCurrency}
                  customers={customers}
                  selectedCustomerId={selectedCustomerId}
                  onCustomerChange={setSelectedCustomerId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customers
                </CardTitle>
                <CardDescription>
                  Manage your customer database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerList
                  customers={customers}
                  onView={handleCustomerView}
                  onEdit={handleCustomerEdit}
                  onDelete={handleCustomerDelete}
                  onAddNew={() => {
                    setEditingCustomer(null);
                    setShowCustomerForm(true);
                  }}
                  onBulkDelete={handleCustomerBulkDelete}
                  isLoading={loadingCustomers}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sale Form Dialog */}
        <Dialog open={showSaleForm} onOpenChange={setShowSaleForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSale ? 'Edit Sale' : 'Add Sale'}</DialogTitle>
            </DialogHeader>
            <SaleForm
              editingSale={editingSale}
              selectedProject={selectedProject}
              selectedCycle={selectedCycle}
              projects={projects}
              cycles={cycles}
              products={products}
              onSuccess={(mode) => {
                if (mode !== 'stay') {
                  setShowSaleForm(false);
                  setEditingSale(null);
                }
                loadSales();
                loadProducts();
              }}
              onCancel={() => {
                setShowSaleForm(false);
                setEditingSale(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Invoice Form Dialog */}
        <Dialog open={showInvoiceForm} onOpenChange={setShowInvoiceForm}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <InvoiceForm
              saleIds={[]}
              defaultCurrency={displayCurrency}
              onSuccess={() => {
                setShowInvoiceForm(false);
                loadInvoices();
              }}
              onCancel={() => setShowInvoiceForm(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Customer Form Dialog */}
        <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
            </DialogHeader>
            <CustomerForm
              editingCustomer={editingCustomer}
              onSuccess={() => {
                setShowCustomerForm(false);
                setEditingCustomer(null);
                loadCustomers();
              }}
              onCancel={() => {
                setShowCustomerForm(false);
                setEditingCustomer(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

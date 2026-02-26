'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, Store, CreditCard, Wallet, FileText } from 'lucide-react';
import { useFilter } from '@/lib/context/filter-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import components
import { ExpenseList, Expense as ExpenseType } from '@/components/expenses';
import { ReceiptList, Receipt as ReceiptType } from '@/components/receipts';
import { VendorCard, Vendor as VendorType } from '@/components/vendors';
import { PaymentMethodList, PaymentMethod as PaymentMethodType } from '@/components/payment-methods';

// Import forms
import { VendorForm } from '@/components/forms/vendor-form';
import { PaymentMethodForm } from '@/components/forms/payment-method-form';
import { ExpenseForm, Expense, ExpenseCategory, ProjectCategory, Cycle, Vendor, PaymentMethod } from '@/components/forms/expense-form';

export default function ExpenseManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedProject, selectedCycle, currentCurrencyCode } = useFilter();
  const [activeTab, setActiveTab] = useState('expenses');

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; project_name: string; project_category_id?: number | null }>>([]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  // Loading states
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  // Modal states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, [selectedProject, selectedCycle]);

  // Handle URL actions for form opening
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-expense') {
      setShowExpenseForm(true);
      setActiveTab('expenses');
    } else if (action === 'add-vendor') {
      setShowVendorForm(true);
      setActiveTab('vendors');
    } else if (action === 'add-payment-method') {
      setShowPaymentMethodForm(true);
      setActiveTab('payment-methods');
    }
  }, [searchParams]);

  const loadAllData = async () => {
    await Promise.all([
      loadExpenses(),
      loadReceipts(),
      loadVendors(),
      loadPaymentMethods(),
      loadCategories(),
      loadProjects(),
      loadProjectCategories(),
      loadCycles(),
    ]);
  };

  const loadProjectCategories = async () => {
    try {
      const response = await fetch('/api/v1/project-categories');
      const data = await response.json();
      if (data.status === 'success') {
        setProjectCategories(data.categories || []);
      }
    } catch (error) {
      // silently fail
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
      // silently fail
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
      // silently fail
    }
  };

  const loadCategories = async () => {
    try {
      const url = new URL('/api/v1/expense-categories', window.location.origin);
      if (selectedProject) url.searchParams.set('projectId', selectedProject);
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        setCategories(data.categories || []);
      }
    } catch (error) {
      // silently fail
    }
  };

  const loadExpenses = async () => {
    setLoadingExpenses(true);
    try {
      const url = new URL('/api/v1/expenses', window.location.origin);
      url.searchParams.set('limit', '5000');
      if (selectedProject) url.searchParams.set('project_id', selectedProject);
      if (selectedCycle) url.searchParams.set('cycle_id', selectedCycle);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const loadReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const url = new URL('/api/v1/receipts', window.location.origin);
      if (selectedProject) url.searchParams.set('project_id', selectedProject);
      if (selectedCycle) url.searchParams.set('cycle_id', selectedCycle);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.status === 'success') {
        setReceipts(data.receipts || []);
      }
    } catch (error) {
      toast.error('Failed to load receipts');
    } finally {
      setLoadingReceipts(false);
    }
  };

  const loadVendors = async () => {
    setLoadingVendors(true);
    try {
      const response = await fetch('/api/v1/vendors');
      const data = await response.json();
      if (data.status === 'success') {
        setVendors(data.vendors || []);
      }
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const response = await fetch('/api/v1/payment-methods');
      const data = await response.json();
      if (data.status === 'success') {
        setPaymentMethods(data.payment_methods || []);
      }
    } catch (error) {
      toast.error('Failed to load payment methods');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Expense handlers
  const handleExpenseEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleExpenseView = (expense: Expense) => {
    router.push(`/expenses/${expense.id}`);
  };

  const handleExpenseDelete = async (expense: Expense) => {
    if (!confirm(`Delete this expense?`)) return;
    try {
      const response = await fetch(`/api/v1/expenses?id=${expense.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Expense deleted');
        loadExpenses();
      }
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const handleExpenseBulkDelete = async (ids: number[]) => {
    if (!confirm(`Delete ${ids.length} expenses?`)) return;
    toast.info('Bulk delete not implemented yet');
  };

  // Receipt handlers
  const handleReceiptViewDetails = (receipt: ReceiptType) => {
    router.push(`/receipts/${receipt.id}`);
  };

  const handleReceiptViewImage = (receipt: ReceiptType) => {
    setSelectedReceipt(receipt);
    setIsImageModalOpen(true);
  };

  const handleReceiptViewOcr = (receipt: ReceiptType) => {
    setSelectedReceipt(receipt);
    setIsOcrModalOpen(true);
  };

  // Vendor handlers
  const handleVendorEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowVendorForm(true);
  };

  const handleVendorDelete = async (vendor: Vendor) => {
    if (!confirm(`Delete vendor "${vendor.vendor_name}"?`)) return;
    try {
      const response = await fetch(`/api/v1/vendors?id=${vendor.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Vendor deleted');
        loadVendors();
      }
    } catch (error) {
      toast.error('Failed to delete vendor');
    }
  };

  // Payment method handlers
  const handlePaymentMethodEdit = (pm: PaymentMethod) => {
    setEditingPaymentMethod(pm);
    setShowPaymentMethodForm(true);
  };

  const handlePaymentMethodDelete = async (pm: PaymentMethod) => {
    if (!confirm(`Delete payment method "${pm.payment_method}"?`)) return;
    try {
      const response = await fetch(`/api/v1/payment-methods?id=${pm.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Payment method deleted');
        loadPaymentMethods();
      }
    } catch (error) {
      toast.error('Failed to delete payment method');
    }
  };

  // Lookup functions
  const getProjectName = (id?: number) => {
    if (!id) return 'N/A';
    return projects.find(p => p.id === id)?.project_name || `Project #${id}`;
  };
  const getCategoryName = (id?: number) => categories.find(c => c.id === id)?.category_name || 'N/A';
  const getVendorName = (id?: number) => vendors.find(v => v.id === id)?.vendor_name || 'N/A';
  const getPaymentMethodName = (id?: number) => paymentMethods.find(m => m.id === id)?.payment_method || 'N/A';

  // Summary calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const receiptTotal = receipts.reduce((sum, r) => sum + (Number(r.structured_data?.summary?.total_due) || 0), 0);

  return (
    <AuthGuard>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Expense Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage expenses, receipts, vendors, and payment methods
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentCurrencyCode
                  ? `${currentCurrencyCode} ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receipt Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentCurrencyCode
                  ? `${currentCurrencyCode} ${receiptTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : receiptTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendors</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendors.length}</div>
              <p className="text-xs text-muted-foreground">
                Active vendors
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentMethods.length}</div>
              <p className="text-xs text-muted-foreground">
                Configured methods
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto">
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="receipts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Receipts</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span>Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="payment-methods" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Methods</span>
              <span className="sm:hidden">Methods</span>
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expenses
                </CardTitle>
                <CardDescription>
                  Track and manage all your expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseList
                  expenses={expenses as unknown as ExpenseType[]}
                  onView={handleExpenseView as unknown as (expense: ExpenseType) => void}
                  onEdit={handleExpenseEdit as unknown as (expense: ExpenseType) => void}
                  onDelete={handleExpenseDelete as unknown as (expense: ExpenseType) => void}
                  onAddNew={() => {
                    setEditingExpense(null);
                    setShowExpenseForm(true);
                  }}
                  onBulkDelete={handleExpenseBulkDelete}
                  isLoading={loadingExpenses}
                  currencyLabel={currentCurrencyCode}
                  getProjectName={getProjectName}
                  getCategoryName={getCategoryName}
                  getVendorName={getVendorName}
                  getPaymentMethodName={getPaymentMethodName}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Receipts
                </CardTitle>
                <CardDescription>
                  View uploaded receipts and OCR data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReceiptList
                  receipts={receipts}
                  onViewDetails={handleReceiptViewDetails}
                  onViewImage={handleReceiptViewImage}
                  onViewOcr={handleReceiptViewOcr}
                  isLoading={loadingReceipts}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Vendors
                </CardTitle>
                <CardDescription>
                  Manage your vendors and suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map((vendor) => (
                    <VendorCard
                      key={vendor.id}
                      vendor={vendor as unknown as VendorType}
                      onEdit={handleVendorEdit as unknown as (vendor: VendorType) => void}
                      onDelete={handleVendorDelete as unknown as (vendor: VendorType) => void}
                    />
                  ))}
                  {vendors.length === 0 && !loadingVendors && (
                    <div className="col-span-full">
                      <div className="p-8 bg-card rounded-lg border border-border text-center text-muted-foreground">
                        <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                        <p>No vendors found.</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => setShowVendorForm(true)}
                        >
                          Add Vendor
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment-methods" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>
                  Configure payment methods for expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodList
                  paymentMethods={paymentMethods as unknown as PaymentMethodType[]}
                  onEdit={handlePaymentMethodEdit as unknown as (method: PaymentMethodType) => void}
                  onDelete={handlePaymentMethodDelete as unknown as (method: PaymentMethodType) => void}
                  onAddNew={() => setShowPaymentMethodForm(true)}
                  isLoading={loadingPaymentMethods}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Receipt Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Receipt Image - {selectedReceipt?.structured_data?.details?.receipt_number || `Receipt #${selectedReceipt?.id}`}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedReceipt?.file_path ? (
                <div className="flex justify-center">
                  <img
                    src={selectedReceipt.file_path}
                    alt="Receipt"
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>No image available for this receipt</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt OCR Modal */}
        <Dialog open={isOcrModalOpen} onOpenChange={setIsOcrModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>OCR Data for Receipt #{selectedReceipt?.id}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="font-semibold mb-2">Raw Text</h3>
                <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap font-mono">
                  {selectedReceipt?.raw_text || 'No raw text available.'}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Structured JSON</h3>
                <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectedReceipt?.structured_data, null, 2) || 'No structured data available.'}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Expense Form Dialog */}
        <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            </DialogHeader>
            <ExpenseForm
              editingExpense={editingExpense}
              selectedProject={selectedProject}
              selectedCycle={selectedCycle}
              projects={projects}
              cycles={cycles}
              categories={categories}
              vendors={vendors}
              paymentMethods={paymentMethods}
              projectCategories={projectCategories}
              setCategories={setCategories}
              setVendors={setVendors}
              onSuccess={() => {
                setShowExpenseForm(false);
                setEditingExpense(null);
                loadExpenses();
                loadReceipts();
                loadVendors();
                loadPaymentMethods();
              }}
              onCancel={() => {
                setShowExpenseForm(false);
                setEditingExpense(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Vendor Form Dialog */}
        <Dialog open={showVendorForm} onOpenChange={setShowVendorForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            </DialogHeader>
            <VendorForm
              editingVendor={editingVendor}
              onSuccess={() => {
                setShowVendorForm(false);
                setEditingVendor(null);
                loadVendors();
              }}
              onCancel={() => {
                setShowVendorForm(false);
                setEditingVendor(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Payment Method Form Dialog */}
        <Dialog open={showPaymentMethodForm} onOpenChange={setShowPaymentMethodForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
            </DialogHeader>
            <PaymentMethodForm
              editingMethod={editingPaymentMethod ? {
                ...editingPaymentMethod,
                method_name: editingPaymentMethod.method_name || editingPaymentMethod.payment_method
              } : null}
              onSuccess={() => {
                setShowPaymentMethodForm(false);
                setEditingPaymentMethod(null);
                loadPaymentMethods();
              }}
              onCancel={() => {
                setShowPaymentMethodForm(false);
                setEditingPaymentMethod(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

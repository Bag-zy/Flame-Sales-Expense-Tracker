'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth-guard';
import { ExpenseDetails, type Receipt, type Expense } from '@/components/expenses';
import { useFilter } from '@/lib/context/filter-context';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExpenseForm, type ExpenseCategory, type Vendor, type PaymentMethod, type ProjectCategory, type Cycle } from '@/components/forms/expense-form';

export default function ExpenseDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { currentCurrencyCode } = useFilter();

    const [expense, setExpense] = useState<Expense | null>(null);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Related data lists for the form
    const [projects, setProjects] = useState<any[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);

    // Related data names for the display
    const [projectName, setProjectName] = useState<string>('');
    const [categoryName, setCategoryName] = useState<string>('');
    const [vendorName, setVendorName] = useState<string>('');
    const [paymentMethodName, setPaymentMethodName] = useState<string>('');
    const [cycleName, setCycleName] = useState<string>('');

    useEffect(() => {
        if (id) {
            loadExpenseData();
        }
    }, [id]);

    const loadExpenseData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Expense
            const expRes = await fetch(`/api/v1/expenses?id=${id}`);
            const expData = await expRes.json();

            if (expData.status === 'success' && expData.expenses?.length > 0) {
                const item = expData.expenses[0];
                setExpense(item);

                // 2. Fetch related data and lists in parallel
                const promises = [];

                // Fetch Lists (for editing)
                promises.push(fetch('/api/v1/projects').then(res => res.json()).then(data => setProjects(data.projects || [])));
                promises.push(fetch('/api/v1/vendors').then(res => res.json()).then(data => setVendors(data.vendors || [])));
                promises.push(fetch('/api/v1/payment-methods').then(res => res.json()).then(data => setPaymentMethods(data.payment_methods || [])));
                promises.push(fetch('/api/v1/project-categories').then(res => res.json()).then(data => setProjectCategories(data.categories || [])));

                if (item.project_id) {
                    promises.push(fetch(`/api/v1/cycles?project_id=${item.project_id}`).then(res => res.json()).then(data => setCycles(data.cycles || [])));

                    // Resolve Display Names
                    promises.push(
                        fetch(`/api/v1/projects?id=${item.project_id}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.status === 'success' && data.projects?.length > 0) {
                                    setProjectName(data.projects[0].project_name);
                                }
                            })
                    );
                }

                if (item.category_id) {
                    promises.push(
                        fetch(`/api/v1/expense-categories?id=${item.category_id}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.status === 'success' && data.categories?.length > 0) {
                                    setCategoryName(data.categories[0].category_name);
                                }
                            })
                    );
                }

                // Fetch all categories for the project to have them ready for the form
                if (item.project_id) {
                    promises.push(fetch(`/api/v1/expense-categories?projectId=${item.project_id}`).then(res => res.json()).then(data => setCategories(data.categories || [])));
                }

                if (item.vendor_id) {
                    promises.push(
                        fetch(`/api/v1/vendors?id=${item.vendor_id}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.status === 'success' && data.vendors?.length > 0) {
                                    setVendorName(data.vendors[0].vendor_name);
                                }
                            })
                    );
                }

                if (item.payment_method_id) {
                    promises.push(
                        fetch(`/api/v1/payment-methods?id=${item.payment_method_id}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.status === 'success' && data.payment_methods?.length > 0) {
                                    setPaymentMethodName(data.payment_methods[0].payment_method);
                                }
                            })
                    );
                }

                if (item.cycle_id) {
                    promises.push(
                        fetch(`/api/v1/cycles?id=${item.cycle_id}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data.status === 'success' && data.cycles?.length > 0) {
                                    setCycleName(data.cycles[0].cycle_name);
                                }
                            })
                    );
                }

                // 3. Fetch Receipts - try by expense_id first
                promises.push(
                    fetch(`/api/v1/receipts?expense_id=${item.id}`)
                        .then(res => res.json())
                        .then(async (data) => {
                            console.log('[ExpenseDetails] Receipt fetch for expense_id', item.id, ':', data);
                            if (data.status === 'success' && data.receipts?.length > 0) {
                                setReceipts(data.receipts);
                            } else {
                                // Fallback: fetch all receipts and check if any belong to
                                // sibling expenses created from the same receipt scan
                                console.log('[ExpenseDetails] No receipts for expense_id', item.id, '- trying fallback');
                                try {
                                    const allReceiptsRes = await fetch('/api/v1/receipts');
                                    const allReceiptsData = await allReceiptsRes.json();
                                    if (allReceiptsData.status === 'success' && allReceiptsData.receipts?.length > 0) {
                                        // Find receipts that are close in time to this expense
                                        const expenseDate = new Date(item.date_time_created || item.created_at).getTime();
                                        const closeReceipts = allReceiptsData.receipts.filter((r: any) => {
                                            const receiptDate = new Date(r.upload_date).getTime();
                                            const timeDiff = Math.abs(receiptDate - expenseDate);
                                            // Within 5 minutes of each other
                                            return timeDiff < 5 * 60 * 1000;
                                        });
                                        if (closeReceipts.length > 0) {
                                            console.log('[ExpenseDetails] Found', closeReceipts.length, 'sibling receipts by timestamp');
                                            setReceipts(closeReceipts);
                                        }
                                    }
                                } catch (err) {
                                    console.error('[ExpenseDetails] Fallback receipt fetch failed:', err);
                                }
                            }
                        })
                );

                await Promise.all(promises);
            } else {
                toast.error('Expense not found');
                router.push('/expense-management');
            }
        } catch (error) {
            console.error('Failed to load expense details:', error);
            toast.error('Failed to load expense details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!expense || !confirm('Are you sure you want to delete this expense?')) return;

        try {
            const res = await fetch(`/api/v1/expenses?id=${expense.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.status === 'success') {
                toast.success('Expense deleted');
                router.push('/expense-management');
            } else {
                toast.error(data.message || 'Failed to delete expense');
            }
        } catch (error) {
            toast.error('Failed to delete expense');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading expense details...</p>
            </div>
        );
    }

    if (!expense) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-xl font-bold mb-4">Expense not found</p>
                <Button onClick={() => router.push('/expense-management')}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto">
                <ExpenseDetails
                    expense={expense}
                    receipts={receipts}
                    projectName={projectName}
                    categoryName={categoryName}
                    vendorName={vendorName}
                    paymentMethodName={paymentMethodName}
                    cycleName={cycleName}
                    currencyLabel={currentCurrencyCode}
                    onDelete={handleDelete}
                    onBack={() => router.back()}
                    onEdit={() => setIsEditing(true)}
                />

                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Expense</DialogTitle>
                        </DialogHeader>
                        <ExpenseForm
                            editingExpense={expense}
                            selectedProject={expense.project_id?.toString()}
                            selectedCycle={expense.cycle_id?.toString()}
                            projects={projects}
                            cycles={cycles}
                            categories={categories}
                            vendors={vendors}
                            paymentMethods={paymentMethods}
                            projectCategories={projectCategories}
                            setCategories={setCategories}
                            setVendors={setVendors}
                            onSuccess={() => {
                                setIsEditing(false);
                                loadExpenseData();
                            }}
                            onCancel={() => setIsEditing(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </AuthGuard>
    );
}

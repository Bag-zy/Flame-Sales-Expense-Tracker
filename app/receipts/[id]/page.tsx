'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useFilter } from '@/lib/context/filter-context';
import {
    ArrowLeft,
    FileText,
    Wallet,
    Calendar,
    Tag,
    Store,
    CreditCard,
    Loader2,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    ImageIcon,
    Trash2,
} from 'lucide-react';

interface Expense {
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
}

interface Receipt {
    id: number;
    expense_id?: number;
    file_path?: string;
    upload_date: string;
    raw_text?: string;
    structured_data?: any;
}

export default function ReceiptDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { currentCurrencyCode } = useFilter();

    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [linkedExpenses, setLinkedExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOcr, setShowOcr] = useState(false);
    const [showStructured, setShowStructured] = useState(false);

    useEffect(() => {
        if (id) {
            loadReceiptData();
        }
    }, [id]);

    const loadReceiptData = async () => {
        // ... previous load logic ...
        setLoading(true);
        try {
            // 1. Fetch the receipt
            const receiptRes = await fetch(`/api/v1/receipts?id=${id}`);
            const receiptData = await receiptRes.json();

            if (receiptData.status !== 'success' || !receiptData.receipts?.length) {
                toast.error('Receipt not found');
                router.push('/expense-management');
                return;
            }

            const receiptItem = receiptData.receipts[0];
            setReceipt(receiptItem);

            // 2. Fetch the linked expense and find sibling expenses from the same scan
            if (receiptItem.expense_id) {
                const expRes = await fetch(`/api/v1/expenses?id=${receiptItem.expense_id}`);
                const expData = await expRes.json();
                if (expData.status === 'success' && expData.expenses?.length > 0) {
                    const primaryExpense = expData.expenses[0];

                    // Find sibling expenses created from the same receipt scan.
                    // They share the same project, vendor, payment method, and were created close together.
                    try {
                        const params = new URLSearchParams();
                        if (primaryExpense.project_id) params.set('project_id', primaryExpense.project_id.toString());

                        const allExpRes = await fetch(`/api/v1/expenses?${params.toString()}`);
                        const allExpData = await allExpRes.json();

                        if (allExpData.status === 'success' && allExpData.expenses?.length > 0) {
                            const primaryTime = new Date(primaryExpense.date_time_created || primaryExpense.created_at).getTime();
                            const siblings = allExpData.expenses.filter((e: Expense) => {
                                const eTime = new Date(e.date_time_created).getTime();
                                const timeDiff = Math.abs(eTime - primaryTime);
                                // Within 60 seconds and same vendor/payment method
                                return timeDiff < 60 * 1000
                                    && e.vendor_id === primaryExpense.vendor_id
                                    && e.payment_method_id === primaryExpense.payment_method_id;
                            });
                            setLinkedExpenses(siblings.length > 0 ? siblings : [primaryExpense]);
                        } else {
                            setLinkedExpenses([primaryExpense]);
                        }
                    } catch {
                        setLinkedExpenses([primaryExpense]);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load receipt details:', error);
            toast.error('Failed to load receipt details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete this receipt and ${linkedExpenses.length} linked expense(s)? This cannot be undone.`)) {
            return;
        }

        setLoading(true);
        try {
            // 1. Delete the receipt itself
            const res = await fetch(`/api/v1/receipts?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.status !== 'success') {
                toast.error(data.message || 'Failed to delete receipt');
                setLoading(false);
                return;
            }

            // 2. Delete all linked expenses
            const deletePromises = linkedExpenses.map((exp) =>
                fetch(`/api/v1/expenses?id=${exp.id}`, { method: 'DELETE' })
            );

            await Promise.all(deletePromises);

            toast.success('Receipt and linked expenses deleted');
            router.push('/expense-management');
        } catch (error) {
            console.error('Delete failed', error);
            toast.error('An error occurred during deletion');
            setLoading(false);
        }
    };

    const totalAmount = useMemo(() => {
        return linkedExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    }, [linkedExpenses]);

    const formattedTotalAmount = currentCurrencyCode
        ? `${currentCurrencyCode} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        : totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 });

    const structured = receipt?.structured_data;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-xl font-bold mb-4">Receipt not found</p>
                <Button onClick={() => router.push('/expense-management')}>Go Back</Button>
            </div>
        );
    }

    const receiptTitle = structured?.details?.receipt_number
        ? `Receipt #${structured.details.receipt_number}`
        : `Receipt #${receipt.id}`;

    return (
        <AuthGuard>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/20">
                            <FileText className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold">{receiptTitle}</h1>
                                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/10 text-amber-600 border-amber-200">
                                    Receipt
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Uploaded {new Date(receipt.upload_date).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20">
                        <CardContent className="py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total from Receipt</p>
                                    <p className="text-2xl font-bold text-amber-600">{formattedTotalAmount}</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                                    <Wallet className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
                        <CardContent className="py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Linked Expenses</p>
                                    <p className="text-2xl font-bold text-blue-600">{linkedExpenses.length}</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                                    <Tag className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    {structured?.vendor?.name && (
                        <Card className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
                            <CardContent className="py-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Vendor</p>
                                        <p className="text-2xl font-bold text-purple-600 truncate">{structured.vendor.name}</p>
                                    </div>
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                                        <Store className="h-6 w-6 text-purple-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Main Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Expenses & Meta */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Linked Expenses */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">Linked Expenses</CardTitle>
                                <CardDescription>Expenses created from this receipt</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {linkedExpenses.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No expenses linked to this receipt.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {linkedExpenses.map((exp) => {
                                            const fmtAmount = currentCurrencyCode
                                                ? `${currentCurrencyCode} ${Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                : Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 });
                                            return (
                                                <div
                                                    key={exp.id}
                                                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                                                    onClick={() => router.push(`/expenses/${exp.id}`)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20">
                                                            <Wallet className="h-4 w-4 text-red-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold">{exp.expense_name || exp.description || `Expense #${exp.id}`}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(exp.date_time_created).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-red-600">{fmtAmount}</span>
                                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Receipt Metadata */}
                        {(structured?.details || structured?.summary) && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Receipt Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-4">
                                        {structured?.details?.receipt_number && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Receipt Number
                                                </p>
                                                <p className="text-sm font-semibold">{structured.details.receipt_number}</p>
                                            </div>
                                        )}
                                        {structured?.details?.date && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" /> Date
                                                </p>
                                                <p className="text-sm font-semibold">{structured.details.date}</p>
                                            </div>
                                        )}
                                        {structured?.details?.payment_method && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <CreditCard className="h-3 w-3" /> Payment Method
                                                </p>
                                                <p className="text-sm font-semibold">{structured.details.payment_method}</p>
                                            </div>
                                        )}
                                        {structured?.summary?.total_due != null && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                    <Wallet className="h-3 w-3" /> Receipt Total
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {currentCurrencyCode
                                                        ? `${currentCurrencyCode} ${Number(structured.summary.total_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                        : Number(structured.summary.total_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        )}
                                        {structured?.summary?.subtotal != null && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground">Subtotal</p>
                                                <p className="text-sm font-semibold">{Number(structured.summary.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        )}
                                        {structured?.summary?.tax != null && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground">Tax</p>
                                                <p className="text-sm font-semibold">{Number(structured.summary.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* OCR Text */}
                        {receipt.raw_text && (
                            <Card>
                                <CardHeader
                                    className="pb-2 cursor-pointer"
                                    onClick={() => setShowOcr(!showOcr)}
                                >
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">OCR Extracted Text</CardTitle>
                                        {showOcr ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </CardHeader>
                                {showOcr && (
                                    <CardContent>
                                        <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs font-mono max-h-[400px] overflow-y-auto">
                                            {receipt.raw_text}
                                        </pre>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Structured JSON */}
                        {structured && (
                            <Card>
                                <CardHeader
                                    className="pb-2 cursor-pointer"
                                    onClick={() => setShowStructured(!showStructured)}
                                >
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Structured Data (JSON)</CardTitle>
                                        {showStructured ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </CardHeader>
                                {showStructured && (
                                    <CardContent>
                                        <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs font-mono max-h-[400px] overflow-y-auto">
                                            {JSON.stringify(structured, null, 2)}
                                        </pre>
                                    </CardContent>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Receipt Image */}
                    <div className="space-y-6">
                        <Card className="h-full max-h-[calc(100vh-200px)] flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                    <ImageIcon className="h-4 w-4" />
                                    Receipt Image
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden flex items-center justify-center bg-muted/20 p-4">
                                {receipt.file_path ? (
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
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-muted-foreground">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>No receipt image available</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}

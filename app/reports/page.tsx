'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { PnlByProjectChart } from '@/components/charts/pnl-by-project-chart';
import { PnlStatement, PnlData, exportPnlToPdf, PnlSummaryCard } from '@/components/pnl';
import { useFilter } from '@/lib/context/filter-context';
import {
  calcExpenseTotalsByProjectCategory,
  calcGrossProfit,
  calcNetProfitFromGrossProfit,
  getProjectCategoryIdByName,
} from '@/lib/accounting/formulas';

interface Sale {
  id: number;
  product_id?: number | null;
  quantity?: number;
  price?: number;
  amount?: number | string;
  amount_org_ccy?: number | string | null;
  status?: string | null;
}

interface Product {
  id: number;
  product_name: string;
}

interface Expense {
  id: number;
  category_id?: number | null;
  expense_name?: string | null;
  description?: string | null;
  amount?: number | string;
  amount_org_ccy?: number | string | null;
}

interface ExpenseCategory {
  id: number;
  category_name: string;
  project_category_id?: number | null;
}

interface ProjectCategory {
  id: number;
  category_name: string;
}

interface PnlLineItem {
  label: string;
  amount: number;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function ReportsPage() {
  const { selectedProject, selectedCycle, projects, currentCurrencyCode } = useFilter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currencyCode = currentCurrencyCode || 'USD';
  const isOrgLevelView = !selectedProject;

  const selectedProjectName = useMemo(() => {
    if (!selectedProject) return 'All projects';
    const project = projects.find((p) => String(p.id) === String(selectedProject));
    return project?.project_name || 'Selected project';
  }, [projects, selectedProject]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const salesUrl = new URL('/api/v1/sales', window.location.origin);
        salesUrl.searchParams.set('status', 'completed');
        salesUrl.searchParams.set('limit', '5000');
        if (selectedProject) salesUrl.searchParams.set('project_id', selectedProject);
        if (selectedCycle) salesUrl.searchParams.set('cycle_id', selectedCycle);

        const expenseUrl = new URL('/api/v1/expenses', window.location.origin);
        expenseUrl.searchParams.set('limit', '5000');
        if (selectedProject) expenseUrl.searchParams.set('project_id', selectedProject);
        if (selectedCycle) expenseUrl.searchParams.set('cycle_id', selectedCycle);

        const categoriesUrl = new URL('/api/v1/expense-categories', window.location.origin);
        if (selectedProject) categoriesUrl.searchParams.set('projectId', selectedProject);

        const projectCategoriesUrl = new URL('/api/v1/project-categories', window.location.origin);
        if (selectedProject) projectCategoriesUrl.searchParams.set('projectId', selectedProject);

        const [salesRes, productsRes, expensesRes, categoriesRes, projectCategoriesRes] = await Promise.all([
          fetch(salesUrl.toString()),
          fetch('/api/v1/products'),
          fetch(expenseUrl.toString()),
          fetch(categoriesUrl.toString()),
          fetch(projectCategoriesUrl.toString()),
        ]);

        const [salesData, productsData, expensesData, categoriesData, projectCategoriesData] = await Promise.all([
          salesRes.json(),
          productsRes.json(),
          expensesRes.json(),
          categoriesRes.json(),
          projectCategoriesRes.json(),
        ]);

        setSales(salesData.status === 'success' ? (salesData.sales || []) : []);
        setProducts(productsData.status === 'success' ? (productsData.products || []) : []);
        setExpenses(expensesData.status === 'success' ? (expensesData.expenses || []) : []);
        setExpenseCategories(categoriesData.status === 'success' ? (categoriesData.categories || []) : []);
        setProjectCategories(projectCategoriesData.status === 'success' ? (projectCategoriesData.categories || []) : []);
      } catch {
        setSales([]);
        setProducts([]);
        setExpenses([]);
        setExpenseCategories([]);
        setProjectCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedProject, selectedCycle]);

  const getSaleAmount = useCallback((sale: Sale) => {
    if (isOrgLevelView) {
      const converted = toNumber(sale.amount_org_ccy);
      if (converted) return converted;
    }
    const raw = toNumber(sale.amount);
    if (raw) return raw;
    return toNumber(sale.quantity) * toNumber(sale.price);
  }, [isOrgLevelView]);

  const getExpenseAmount = useCallback((expense: Expense) => {
    if (isOrgLevelView) {
      const converted = toNumber(expense.amount_org_ccy);
      if (converted) return converted;
    }
    return toNumber(expense.amount);
  }, [isOrgLevelView]);

  const netSalesItems: PnlLineItem[] = useMemo(() => {
    const byProductId = new Map<number, number>();

    for (const s of sales) {
      if (String(s.status || '').toLowerCase() !== 'completed') continue;
      const productId = typeof s.product_id === 'number' ? s.product_id : null;
      if (!productId) continue;
      const amt = getSaleAmount(s);
      if (!amt) continue;

      const prev = byProductId.get(productId) ?? 0;
      byProductId.set(productId, prev + amt);
    }

    const nameById = new Map<number, string>();
    for (const p of products) {
      if (typeof p?.id === 'number') {
        nameById.set(p.id, p.product_name);
      }
    }

    return Array.from(byProductId.entries())
      .map(([productId, amount]) => ({
        label: nameById.get(productId) || 'Unknown product',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [products, sales, getSaleAmount]);

  const netSalesTotal = useMemo(() => {
    return netSalesItems.reduce((sum, item) => sum + item.amount, 0);
  }, [netSalesItems]);

  const categoryById = useMemo(() => {
    const map = new Map<number, ExpenseCategory>();
    for (const c of expenseCategories) {
      if (typeof c?.id === 'number') {
        map.set(c.id, c);
      }
    }
    return map;
  }, [expenseCategories]);

  const inventoryProjectCategoryId = useMemo(() => {
    return getProjectCategoryIdByName(projectCategories, 'inventory') ?? getProjectCategoryIdByName(projectCategories, 'cogs') ?? null;
  }, [projectCategories]);

  const operatingProjectCategoryId = useMemo(() => {
    return getProjectCategoryIdByName(projectCategories, 'operating expenses') ?? null;
  }, [projectCategories]);

  const inventoryExpenseItems: PnlLineItem[] = useMemo(() => {
    const list: PnlLineItem[] = [];
    for (const e of expenses) {
      const categoryId = e.category_id ?? null;
      if (!categoryId) continue;
      const cat = categoryById.get(Number(categoryId));
      if (!cat) continue;
      if (!inventoryProjectCategoryId) continue;
      if (cat.project_category_id !== inventoryProjectCategoryId) continue;

      const amt = getExpenseAmount(e);
      if (!amt) continue;

      const existing = list.find((item) => item.label === cat.category_name);
      if (existing) {
        existing.amount += amt;
      } else {
        list.push({ label: cat.category_name, amount: amt });
      }
    }
    return list.sort((a, b) => b.amount - a.amount);
  }, [categoryById, inventoryProjectCategoryId, expenses, getExpenseAmount]);

  const operatingExpenseItems: PnlLineItem[] = useMemo(() => {
    const list: PnlLineItem[] = [];
    for (const e of expenses) {
      const categoryId = e.category_id ?? null;
      if (!categoryId) continue;
      const cat = categoryById.get(Number(categoryId));
      if (!cat) continue;
      if (!operatingProjectCategoryId) continue;
      if (cat.project_category_id !== operatingProjectCategoryId) continue;

      const amt = getExpenseAmount(e);
      if (!amt) continue;

      const existing = list.find((item) => item.label === cat.category_name);
      if (existing) {
        existing.amount += amt;
      } else {
        list.push({ label: cat.category_name, amount: amt });
      }
    }
    return list.sort((a, b) => b.amount - a.amount);
  }, [categoryById, operatingProjectCategoryId, expenses, getExpenseAmount]);

  const normalizedExpensesForTotals = useMemo(() => {
    return expenses.map((e) => ({
      ...e,
      amount: getExpenseAmount(e),
    }));
  }, [expenses, getExpenseAmount]);

  const { totalInventory, totalOperatingExpenses } = useMemo(() => {
    const totals = calcExpenseTotalsByProjectCategory(
      normalizedExpensesForTotals,
      expenseCategories,
      projectCategories
    );
    return {
      totalInventory: totals.totalCogs,
      totalOperatingExpenses: totals.totalOperatingExpenses
    };
  }, [expenseCategories, normalizedExpensesForTotals, projectCategories]);

  const grossProfit = useMemo(() => {
    return calcGrossProfit(netSalesTotal, totalInventory);
  }, [netSalesTotal, totalInventory]);

  const netProfitLoss = useMemo(() => {
    return calcNetProfitFromGrossProfit(grossProfit, totalOperatingExpenses);
  }, [grossProfit, totalOperatingExpenses]);

  const pnlData: PnlData = {
    netSalesItems,
    netSalesTotal,
    cogsItems: inventoryExpenseItems,
    totalCogs: totalInventory,
    operatingExpenseItems,
    totalOperatingExpenses,
    grossProfit,
    netProfitLoss,
  };

  const handleExportPdf = () => {
    exportPnlToPdf({
      data: pnlData,
      title: 'P&L Statement',
      subtitle: selectedProjectName,
      currencyCode,
    });
  };

  return (
    <AuthGuard>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">P&L Reports</h1>
              <p className="text-sm text-muted-foreground">
                Profit and Loss statement for {selectedProjectName}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PnlSummaryCard
            title="Net Sales"
            amount={netSalesTotal}
            currencyCode={currencyCode}
            trend={netSalesTotal > 0 ? 'up' : 'neutral'}
            isLoading={isLoading}
          />
          <PnlSummaryCard
            title="Gross Profit"
            amount={grossProfit}
            currencyCode={currencyCode}
            description="Net Sales - Inventory"
            trend={grossProfit >= 0 ? 'up' : 'down'}
            isLoading={isLoading}
          />
          <PnlSummaryCard
            title="Operating Expenses"
            amount={totalOperatingExpenses}
            currencyCode={currencyCode}
            trend="down"
            isLoading={isLoading}
          />
          <PnlSummaryCard
            title="Net Profit / Loss"
            amount={netProfitLoss}
            currencyCode={currencyCode}
            description="Gross Profit - Operating Expenses"
            trend={netProfitLoss >= 0 ? 'up' : 'down'}
            isLoading={isLoading}
          />
        </div>

        {/* P&L Chart and Statement */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                P&L by Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PnlByProjectChart />
            </CardContent>
          </Card>

          <PnlStatement
            data={pnlData}
            title="P&L Statement"
            subtitle={selectedProjectName}
            currencyCode={currencyCode}
            isLoading={isLoading}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
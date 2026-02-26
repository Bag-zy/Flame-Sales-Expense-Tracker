'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export interface PnlLineItem {
  label: string;
  amount: number;
}

export interface PnlData {
  netSalesItems: PnlLineItem[];
  netSalesTotal: number;
  cogsItems: PnlLineItem[];
  totalCogs: number;
  operatingExpenseItems: PnlLineItem[];
  totalOperatingExpenses: number;
  grossProfit: number;
  netProfitLoss: number;
}

export interface PnlStatementProps {
  data: PnlData;
  title?: string;
  subtitle?: string;
  currencyCode?: string;
  isLoading?: boolean;
  onExportPdf?: () => void;
}

function formatCurrency(value: number, currencyCode: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(value);
}

export function PnlStatement({
  data,
  title = 'P&L Statement',
  subtitle,
  currencyCode = 'USD',
  isLoading = false,
  onExportPdf,
}: PnlStatementProps) {
  const formatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }),
    [currencyCode]
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    netSalesItems,
    netSalesTotal,
    cogsItems,
    totalCogs,
    operatingExpenseItems,
    totalOperatingExpenses,
    grossProfit,
    netProfitLoss,
  } = data;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {onExportPdf && (
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <FileDown className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-8">
          {/* Net Sales Section */}
          <PnlSection
            title="Net Sales"
            total={netSalesTotal}
            items={netSalesItems}
            formatter={formatter}
            totalColor="text-green-600"
            icon={<DollarSign className="h-4 w-4" />}
          />

          {/* Inventory Section */}
          <PnlSection
            title="Inventory"
            total={totalCogs}
            items={cogsItems}
            formatter={formatter}
            totalColor="text-red-600"
          />

          {/* Gross Profit Section */}
          <div className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Gross Profit
              </div>
              <div
                className={`text-sm font-semibold tabular-nums ${
                  grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatter.format(grossProfit)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net Sales - COGS
            </p>
          </div>

          {/* Operating Expenses Section */}
          <PnlSection
            title="Operating Expenses"
            total={totalOperatingExpenses}
            items={operatingExpenseItems}
            formatter={formatter}
            totalColor="text-red-600"
          />

          {/* Net Profit/Loss Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold flex items-center gap-2">
                {netProfitLoss >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                Net Profit / Loss
              </div>
              <div
                className={`text-base font-semibold tabular-nums ${
                  netProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatter.format(netProfitLoss)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross Profit - Operating Expenses
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PnlSectionProps {
  title: string;
  total: number;
  items: PnlLineItem[];
  formatter: Intl.NumberFormat;
  totalColor?: string;
  icon?: React.ReactNode;
}

function PnlSection({ title, total, items, formatter, totalColor = '', icon }: PnlSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between border-b pb-2">
        <div className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </div>
        <div className={`text-sm font-semibold tabular-nums ${totalColor}`}>
          {formatter.format(total)}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            No {title.toLowerCase()} items found.
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <div className="text-muted-foreground truncate flex-1">{item.label}</div>
              <div className="tabular-nums shrink-0">{formatter.format(item.amount)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export interface PnlSummaryCardProps {
  title: string;
  amount: number;
  currencyCode?: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  isLoading?: boolean;
}

export function PnlSummaryCard({
  title,
  amount,
  currencyCode = 'USD',
  description,
  trend = 'neutral',
  isLoading = false,
}: PnlSummaryCardProps) {
  const formatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }),
    [currencyCode]
  );

  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-foreground';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : DollarSign;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${trendColor}`}>{formatter.format(amount)}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export interface PnlExportProps {
  data: PnlData;
  title?: string;
  subtitle?: string;
  currencyCode?: string;
}

export function exportPnlToPdf({ data, title = 'P&L Statement', subtitle, currencyCode = 'USD' }: PnlExportProps): void {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  });

  const escapeHtml = (value: string): string => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const format = (value: number) => escapeHtml(formatter.format(value));

  const renderRows = (items: PnlLineItem[]) => {
    if (items.length === 0) {
      return '<tr><td class="label">No items found.</td><td class="amount"></td></tr>';
    }
    return items
      .map(
        (item) =>
          `<tr><td class="label">${escapeHtml(item.label)}</td><td class="amount">${format(item.amount)}</td></tr>`
      )
      .join('');
  };

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 32px; color: #111827; }
      h1 { font-size: 20px; margin: 0; }
      .subtitle { margin-top: 4px; color: #6b7280; font-size: 12px; }
      .section { margin-top: 20px; }
      .section-title { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; font-weight: 600; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      td { padding: 6px 0; vertical-align: top; font-size: 12px; }
      .label { color: #6b7280; padding-right: 12px; }
      .amount { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
      .total-row td { padding-top: 10px; font-weight: 600; color: #111827; }
      .grand-total { margin-top: 18px; border-top: 1px solid #111827; padding-top: 12px; display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; }
      .positive { color: #16a34a; }
      .negative { color: #dc2626; }
      @media print { body { margin: 0.5in; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}

    <div class="section">
      <div class="section-title"><span>Net Sales</span><span>${format(data.netSalesTotal)}</span></div>
      <table>${renderRows(data.netSalesItems)}</table>
    </div>

    <div class="section">
      <div class="section-title"><span>COGS</span><span>${format(data.totalCogs)}</span></div>
      <table>${renderRows(data.cogsItems)}</table>
    </div>

    <div class="section">
      <div class="section-title"><span>Gross Profit</span><span class="${data.grossProfit >= 0 ? 'positive' : 'negative'}">${format(data.grossProfit)}</span></div>
    </div>

    <div class="section">
      <div class="section-title"><span>Operating Expenses</span><span>${format(data.totalOperatingExpenses)}</span></div>
      <table>${renderRows(data.operatingExpenseItems)}</table>
    </div>

    <div class="grand-total">
      <span>Net Profit / Loss</span>
      <span class="${data.netProfitLoss >= 0 ? 'positive' : 'negative'}">${format(data.netProfitLoss)}</span>
    </div>
  </body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  setTimeout(() => {
    win.print();
  }, 250);
}

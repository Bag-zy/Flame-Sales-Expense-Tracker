'use client';

import { useMemo } from 'react';
import { Building2, Globe, Wallet, TrendingUp, TrendingDown, PiggyBank, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Organization } from './organization-card';

export interface OrganizationStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalBudgetAllotment: number;
}

export interface OrganizationDetailsProps {
  organization: Organization;
  stats?: OrganizationStats | null;
  onEdit?: () => void;
  onBack?: () => void;
  currencyLabel?: string;
}

export function OrganizationDetails({
  organization,
  stats,
  onEdit,
  onBack,
  currencyLabel = '',
}: OrganizationDetailsProps) {
  const remainingSpend = useMemo(() => {
    return (stats?.totalBudgetAllotment ?? 0) - (stats?.totalExpenses ?? 0);
  }, [stats]);

  const formatCurrency = (amount: number) => {
    if (currencyLabel) {
      return `${currencyLabel} ${Number(amount).toLocaleString()}`;
    }
    return Number(amount).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {new Date(organization.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              Edit Organization
            </Button>
          )}
        </div>
      </div>

      {/* Organization Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {organization.country_code || 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {organization.currency_code || 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currency Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-lg font-semibold">
              {organization.currency_symbol || 'Not set'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Financial Summary</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <CardDescription className="text-[10px]">All time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-bold">
                    {formatCurrency(stats.totalRevenue)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <CardDescription className="text-[10px]">All time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-lg font-bold">
                    {formatCurrency(stats.totalExpenses)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
                <CardDescription className="text-[10px]">Revenue - Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <span
                  className={`text-lg font-bold ${
                    stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(stats.netProfit)}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Remaining Budget
                </CardTitle>
                <CardDescription className="text-[10px]">Budget - Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                  <span
                    className={`text-lg font-bold ${
                      remainingSpend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(remainingSpend)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

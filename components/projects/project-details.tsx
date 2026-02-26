'use client';

import { useMemo } from 'react';
import { FolderKanban, Calendar, Wallet, Tag, TrendingUp, TrendingDown, PiggyBank, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Project } from './project-card';

export interface ProjectStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalBudgetAllotment: number;
}

export interface ProjectDetailsProps {
  project: Project;
  stats?: ProjectStats | null;
  categoryName?: string;
  onEdit?: () => void;
  onBack?: () => void;
  currencyLabel?: string;
}

export function ProjectDetails({
  project,
  stats,
  categoryName,
  onEdit,
  onBack,
  currencyLabel = '',
}: ProjectDetailsProps) {
  const remainingSpend = useMemo(() => {
    return (stats?.totalBudgetAllotment ?? 0) - (stats?.totalExpenses ?? 0);
  }, [stats]);

  const formatCurrency = (amount: number) => {
    if (currencyLabel) {
      return `${currencyLabel} ${Number(amount).toLocaleString()}`;
    }
    return Number(amount).toLocaleString();
  };

  const now = new Date();
  const start = project.start_date ? new Date(project.start_date) : null;
  const end = project.end_date ? new Date(project.end_date) : null;

  const isActive = (!start || start <= now) && (!end || end >= now);
  const isUpcoming = start && start > now;
  const isCompleted = end && end < now;

  const getStatusBadge = () => {
    if (isActive) return <Badge variant="default" className="bg-green-600">Active</Badge>;
    if (isUpcoming) return <Badge variant="secondary">Upcoming</Badge>;
    if (isCompleted) return <Badge variant="outline">Completed</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.project_name}</h1>
              {getStatusBadge()}
            </div>
            <div className="text-sm text-muted-foreground">
              Category: {categoryName || 'N/A'}
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
              Edit Project
            </Button>
          )}
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {project.start_date 
                  ? new Date(project.start_date).toLocaleDateString() 
                  : 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">End Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {project.end_date 
                  ? new Date(project.end_date).toLocaleDateString() 
                  : 'Not set'}
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
                {project.currency_code || currencyLabel || 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {project.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{project.description}</p>
          </CardContent>
        </Card>
      )}

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
                <CardDescription className="text-[10px]">Project</CardDescription>
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
                <CardDescription className="text-[10px]">Project</CardDescription>
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
                  Budget Allotment
                </CardTitle>
                <CardDescription className="text-[10px]">Total Budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold">
                    {formatCurrency(stats.totalBudgetAllotment)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Remaining Spend */}
          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining Budget
              </CardTitle>
              <CardDescription className="text-xs">Budget - Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <span
                className={`text-2xl font-bold ${
                  remainingSpend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(remainingSpend)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

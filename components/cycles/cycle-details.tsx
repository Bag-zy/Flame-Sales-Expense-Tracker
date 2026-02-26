'use client';

import { useMemo } from 'react';
import { Repeat, Calendar, Wallet, Hash, TrendingUp, TrendingDown, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cycle } from './cycle-card';

export interface BudgetTransaction {
  id: number;
  organization_id: number;
  project_id?: number;
  cycle_id: number;
  type: string;
  amount_delta: number;
  amount_delta_org_ccy: number;
  budget_before?: number;
  budget_after?: number;
  notes?: string;
  created_by?: number;
  created_at: string;
}

export interface CycleDetailsProps {
  cycle: Cycle;
  history?: BudgetTransaction[];
  onSave?: (data: { cycle_name: string; start_date: string; end_date: string }) => void;
  onDelete?: () => void;
  onAddBudget?: () => void;
  onSetBudget?: () => void;
  onBack?: () => void;
  isSaving?: boolean;
  formData: {
    cycle_name: string;
    start_date: string;
    end_date: string;
  };
  setFormData: (data: { cycle_name: string; start_date: string; end_date: string }) => void;
  currencyLabel?: string;
}

export function CycleDetails({
  cycle,
  history = [],
  onSave,
  onDelete,
  onAddBudget,
  onSetBudget,
  onBack,
  isSaving = false,
  formData,
  setFormData,
  currencyLabel = '',
}: CycleDetailsProps) {
  const budgetValue = useMemo(() => {
    return Number(cycle?.budget_allotment ?? 0) || 0;
  }, [cycle?.budget_allotment]);

  const now = new Date();
  const start = cycle.start_date ? new Date(cycle.start_date) : null;
  const end = cycle.end_date ? new Date(cycle.end_date) : null;

  const isActive = (!start || start <= now) && (!end || end >= now);
  const isUpcoming = start && start > now;
  const isEnded = end && end < now;

  const getStatusBadge = () => {
    if (isActive) return <Badge variant="default" className="bg-green-600">Active</Badge>;
    if (isUpcoming) return <Badge variant="secondary">Upcoming</Badge>;
    if (isEnded) return <Badge variant="outline">Ended</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Repeat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{cycle.cycle_name}</h1>
              {getStatusBadge()}
            </div>
            <div className="text-sm text-muted-foreground">Cycle #{cycle.cycle_number}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          {onSetBudget && (
            <Button variant="outline" onClick={onSetBudget}>
              Set Budget
            </Button>
          )}
          {onAddBudget && (
            <Button onClick={onAddBudget}>Add Budget</Button>
          )}
          {onDelete && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Edit Form and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Edit Form */}
        {onSave && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Cycle</CardTitle>
              <CardDescription>Update this cycle&apos;s details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">Cycle Name</label>
                <Input
                  value={formData.cycle_name}
                  onChange={(e) => setFormData({ ...formData, cycle_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">End Date</label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="outline" onClick={() => window.location.reload()} disabled={isSaving}>
                Reset
              </Button>
              <Button onClick={() => onSave(formData)} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Key dates, budget, and history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Start Date</div>
                <div className="font-medium">
                  {cycle.start_date ? new Date(cycle.start_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">End Date</div>
                <div className="font-medium">
                  {cycle.end_date ? new Date(cycle.end_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Budget</div>
                <div className="font-medium">
                  {currencyLabel ? `${currencyLabel} ${budgetValue.toLocaleString()}` : budgetValue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Budget History */}
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <History className="h-4 w-4" />
                Budget History
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium px-3 py-2">Date</th>
                      <th className="text-left font-medium px-3 py-2">Type</th>
                      <th className="text-right font-medium px-3 py-2">Delta</th>
                      <th className="text-right font-medium px-3 py-2">Before</th>
                      <th className="text-right font-medium px-3 py-2">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b border-border/60">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{h.type}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {h.amount_delta > 0 ? `+${h.amount_delta}` : h.amount_delta}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {h.budget_before ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {h.budget_after ?? '—'}
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                          No budget changes yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

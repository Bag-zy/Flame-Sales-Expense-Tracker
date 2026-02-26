'use client';

import { Repeat, Calendar, Wallet, Hash } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Cycle {
  id: number;
  cycle_name: string;
  cycle_number: number;
  project_id: number;
  start_date?: string;
  end_date?: string;
  budget_allotment?: number;
  created_by: number;
  created_at: string;
}

export interface CycleCardProps {
  cycle: Cycle;
  projectName?: string;
  onSelect?: (cycle: Cycle) => void;
  onView?: (cycle: Cycle) => void;
  onEdit?: (cycle: Cycle) => void;
  onDelete?: (cycle: Cycle) => void;
  isSelected?: boolean;
  showActions?: boolean;
  currencyLabel?: string;
}

export function CycleCard({
  cycle,
  projectName,
  onSelect,
  onView,
  onEdit,
  onDelete,
  isSelected = false,
  showActions = true,
  currencyLabel = '',
}: CycleCardProps) {
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
    <Card
      className={`transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(cycle)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Repeat className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{cycle.cycle_name}</CardTitle>
              <CardDescription className="text-xs">
                {projectName || `Project #${cycle.project_id}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge()}
            {isSelected && <Badge variant="default">Selected</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">Cycle #{cycle.cycle_number}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">
              {cycle.start_date 
                ? new Date(cycle.start_date).toLocaleDateString() 
                : 'No start'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">
              {cycle.end_date 
                ? new Date(cycle.end_date).toLocaleDateString() 
                : 'No end'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">
              {cycle.budget_allotment 
                ? `${currencyLabel} ${Number(cycle.budget_allotment).toLocaleString()}` 
                : 'No budget'}
            </span>
          </div>
        </div>

        {showActions && (onView || onEdit || onDelete) && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(cycle);
                }}
              >
                View Details
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(cycle);
                }}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(cycle);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

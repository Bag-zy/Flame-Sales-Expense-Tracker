'use client';

import { useState } from 'react';
import { Repeat, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CycleCard, Cycle } from './cycle-card';

export interface CycleListProps {
  cycles: Cycle[];
  selectedCycleId?: string;
  onSelect: (cycle: Cycle) => void;
  onView: (cycle: Cycle) => void;
  onEdit?: (cycle: Cycle) => void;
  onDelete?: (cycle: Cycle) => void;
  onAddNew: () => void;
  isLoading?: boolean;
  getProjectName?: (id: number) => string;
  currencyLabel?: string;
}

export function CycleList({
  cycles,
  selectedCycleId,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
  getProjectName,
  currencyLabel = '',
}: CycleListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCycles = cycles.filter((cycle) =>
    cycle.cycle_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const now = new Date();
  const activeCount = cycles.filter((c) => {
    const start = c.start_date ? new Date(c.start_date) : null;
    const end = c.end_date ? new Date(c.end_date) : null;
    return (!start || start <= now) && (!end || end >= now);
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Cycles ({cycles.length})</h2>
            <p className="text-xs text-muted-foreground">{activeCount} active</p>
          </div>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cycle
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cycles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredCycles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Repeat className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No cycles found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new cycle'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Cycle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              projectName={getProjectName?.(cycle.project_id)}
              isSelected={selectedCycleId === cycle.id.toString()}
              onSelect={onSelect}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              currencyLabel={currencyLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

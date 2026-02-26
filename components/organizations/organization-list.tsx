'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrganizationCard, Organization } from './organization-card';

export interface OrganizationListProps {
  organizations: Organization[];
  selectedOrganizationId?: string;
  onSelect: (organization: Organization) => void;
  onEdit: (organization: Organization) => void;
  onDelete?: (organization: Organization) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export function OrganizationList({
  organizations,
  selectedOrganizationId,
  onSelect,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
}: OrganizationListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            Organizations ({organizations.length})
          </h2>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Organization
        </Button>
      </div>

      <Input
        placeholder="Search organizations..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      {filteredOrganizations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No organizations found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating a new organization'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Organization
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              isSelected={selectedOrganizationId === org.id.toString()}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

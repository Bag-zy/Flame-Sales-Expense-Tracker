'use client';

import { Building2, Globe, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Organization {
  id: number;
  name: string;
  created_at: string;
  country_code?: string | null;
  currency_code?: string;
  currency_symbol?: string;
}

export interface OrganizationCardProps {
  organization: Organization;
  onSelect?: (org: Organization) => void;
  onEdit?: (org: Organization) => void;
  onDelete?: (org: Organization) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

export function OrganizationCard({
  organization,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
  showActions = true,
}: OrganizationCardProps) {
  return (
    <Card
      className={`transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={() => onSelect?.(organization)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{organization.name}</CardTitle>
              <CardDescription className="text-xs">
                Created {new Date(organization.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          {isSelected && <Badge variant="default">Selected</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>{organization.country_code || 'No country'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            <span>{organization.currency_code || 'No currency'}</span>
          </div>
        </div>
        {showActions && (onEdit || onDelete) && (
          <div className="mt-3 flex justify-end gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(organization);
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
                  onDelete(organization);
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

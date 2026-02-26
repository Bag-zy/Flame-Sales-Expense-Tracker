'use client';

import { useState } from 'react';
import { CreditCard, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface PaymentMethod {
  id: number;
  method_name: string;
  method_type?: string;
  description?: string;
  created_by: number;
  created_at: string;
}

export interface PaymentMethodCardProps {
  method: PaymentMethod;
  onEdit?: (method: PaymentMethod) => void;
  onDelete?: (method: PaymentMethod) => void;
}

export function PaymentMethodCard({ method, onEdit, onDelete }: PaymentMethodCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{method.method_name}</CardTitle>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(method)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(method)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {method.method_type && (
          <p className="text-sm text-muted-foreground mb-1">Type: {method.method_type}</p>
        )}
        {method.description && (
          <p className="text-sm text-muted-foreground">{method.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export function PaymentMethodList({
  paymentMethods,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
}: PaymentMethodListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMethods = paymentMethods.filter(
    (method) =>
      method.method_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (method.method_type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (method.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Payment Methods ({paymentMethods.length})</h2>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payment Method
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search payment methods..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredMethods.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No payment methods found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating a new payment method'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Payment Method
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

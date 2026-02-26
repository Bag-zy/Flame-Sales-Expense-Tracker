'use client';

import { useMemo, useState } from 'react';
import { User, Mail, Phone, Plus, Search, Trash2, Eye, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  address?: string;
  created_by: number;
  created_at: string;
}

export interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
}

export function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onView,
}: CustomerCardProps) {
  const phone = customer.phone || customer.phone_number;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{customer.name}</CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="grid grid-cols-1 gap-1 text-sm">
          {customer.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{customer.email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">{phone}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          {onView && (
            <Button variant="ghost" size="sm" onClick={() => onView(customer)}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(customer)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(customer)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  onAddNew: () => void;
  onBulkDelete?: (ids: number[]) => void;
  isLoading?: boolean;
}

export function CustomerList({
  customers,
  onEdit,
  onDelete,
  onView,
  onAddNew,
  onBulkDelete,
  isLoading = false,
}: CustomerListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.phone_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    onBulkDelete?.(selectedIds);
    setSelectedIds([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-lg border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-b animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Customers ({customers.length})</h2>
        </div>
        <div className="flex gap-2">
          {onBulkDelete && selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-1" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button onClick={onAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No customers found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new customer'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {onBulkDelete && (
                    <th className="px-4 py-3 text-left w-10">
                      <Checkbox
                        checked={
                          selectedIds.length > 0 && selectedIds.length === filteredCustomers.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Phone</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCustomers.map((customer) => {
                  const phone = customer.phone || customer.phone_number;
                  return (
                    <tr key={customer.id} className="hover:bg-muted/50">
                      {onBulkDelete && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Checkbox
                            checked={selectedIds.includes(customer.id)}
                            onCheckedChange={() => toggleSelect(customer.id)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{customer.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {customer.email || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onView(customer)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onEdit(customer)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(customer)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

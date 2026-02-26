'use client';

import { useState } from 'react';
import { Store, Search, Plus, User, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Vendor {
  id: number;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  notes?: string;
  created_by: number;
  created_at: string;
}

export interface VendorCardProps {
  vendor: Vendor;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (vendor: Vendor) => void;
}

export function VendorCard({ vendor, onEdit, onDelete }: VendorCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{vendor.vendor_name}</CardTitle>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(vendor)}>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(vendor)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{vendor.contact_person || 'No contact'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{vendor.email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{vendor.phone_number || 'No phone'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{vendor.address || 'No address'}</span>
          </div>
        </div>
        {vendor.notes && (
          <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
            {vendor.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export interface VendorListProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export function VendorList({
  vendors,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
}: VendorListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVendors = vendors.filter((vendor) =>
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_person?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (vendor.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
          <Store className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Vendors ({vendors.length})</h2>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredVendors.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No vendors found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating a new vendor'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Vendor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

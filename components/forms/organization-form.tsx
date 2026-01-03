'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { Switcher } from '@/components/ui/shadcn-io/navbar-12/Switcher';

interface Organization {
  id: number;
  name: string;
  country_code?: string | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
}

interface CountryOption {
  code: string;
  name: string;
  currency_code: string | null;
}

interface OrganizationFormProps {
  editingOrganization?: Organization | null;
  onSuccess: (organization: Organization) => void;
  onCancel?: () => void;
}

export function OrganizationForm({ editingOrganization, onSuccess, onCancel }: OrganizationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    countryCode: '',
    currencyCode: '',
    currencySymbol: '',
  });
  const [currencyOptions, setCurrencyOptions] = useState<{ code: string; name: string }[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingOrganization) {
      setFormData({
        name: editingOrganization.name,
        countryCode:
          (editingOrganization as any).countryCode ||
          editingOrganization.country_code ||
          '',
        currencyCode:
          (editingOrganization as any).currencyCode ||
          editingOrganization.currency_code ||
          '',
        currencySymbol:
          (editingOrganization as any).currencySymbol ||
          editingOrganization.currency_symbol ||
          '',
      });
    } else {
      setFormData({ name: '', countryCode: '', currencyCode: '', currencySymbol: '' });
    }
  }, [editingOrganization]);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/api/v1/countries');
        const data = await response.json();
        if (data.status === 'success') {
          setCountryOptions(data.countries || []);
        }
      } catch {
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await fetch('/api/v1/currencies');
        const data = await response.json();
        if (data.status === 'success') {
          setCurrencyOptions(data.currencies || []);
        }
      } catch {
        // silently ignore; user can still type currency manually if needed
      }
    };

    loadCurrencies();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectCountry = (country: CountryOption) => {
    setFormData((prev) => ({
      ...prev,
      countryCode: country.code,
      currencyCode: country.currency_code || prev.currencyCode,
      currencySymbol: prev.currencySymbol,
    }));
  };

  const handleSelectCurrency = (currency: { code: string; name: string }) => {
    setFormData((prev) => ({ ...prev, currencyCode: currency.code }));
  };

  const countryItems = countryOptions.map((country) => ({
    value: country.code,
    label: `${country.name} (${country.code})`,
  }));

  const currencyItems = currencyOptions.map((currency) => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
  }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/v1/organizations', {
        method: editingOrganization ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingOrganization
            ? { ...formData, id: editingOrganization.id }
            : formData,
        ),
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success(`Organization ${editingOrganization ? 'updated' : 'created'} successfully`);
        onSuccess(data.organization);
      } else {
        toast.error(data.message || 'Failed to save organization');
      }
    } catch (error) {
      toast.error('Failed to save organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground">Organization Name *</label>
        <Input
          name="name"
          placeholder="Enter your organization name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground">Country</label>
          <Switcher
            items={countryItems}
            value={formData.countryCode}
            onChange={(value) => {
              const selected = countryOptions.find((c) => c.code === value);
              if (selected) {
                handleSelectCountry(selected);
              } else {
                setFormData((prev) => ({ ...prev, countryCode: value }));
              }
            }}
            placeholder="Select country"
            searchPlaceholder="Search country..."
            emptyText="No countries found."
            widthClassName="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Currency</label>
          <Switcher
            items={currencyItems}
            value={formData.currencyCode}
            onChange={(value) => {
              const selected = currencyOptions.find((c) => c.code === value);
              if (selected) {
                handleSelectCurrency(selected);
              } else {
                setFormData((prev) => ({ ...prev, currencyCode: value }));
              }
            }}
            placeholder="Select currency"
            searchPlaceholder="Search currency..."
            emptyText="No currencies found."
            widthClassName="w-full"
          />
        </div>
      </div>
      <DialogFooter className='pt-4'>
        {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
            </Button>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {editingOrganization ? 'Update Organization' : 'Create Organization'}
        </Button>
      </DialogFooter>
    </form>
  );
}

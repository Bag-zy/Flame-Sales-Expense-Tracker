"use client";

import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { useFilter } from '@/lib/context/filter-context';

export interface Cycle {
  id: number;
  cycle_name: string;
  cycle_number: number;
  project_id: number;
  start_date?: string;
  end_date?: string;
  budget_allotment?: number;
  budget_allotment_org_ccy?: number;
}

interface CycleFormProps {
  projectId: number;
  existingCycle?: Cycle | null;
  existingCycles?: Cycle[];
  onSuccess: (cycle: Cycle) => void;
  onCancel: () => void;
}

export function CycleForm({ projectId, existingCycle, existingCycles, onSuccess, onCancel }: CycleFormProps) {
  const [formData, setFormData] = useState({
    cycle_number: 1,
    start_date: '',
    end_date: '',
    budget_allotment: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const { currentCurrencyCode } = useFilter();

  useEffect(() => {
    if (existingCycle) {
      setFormData({
        cycle_number: existingCycle.cycle_number,
        start_date: existingCycle.start_date ? new Date(existingCycle.start_date).toISOString().split('T')[0] : '',
        end_date: existingCycle.end_date ? new Date(existingCycle.end_date).toISOString().split('T')[0] : '',
        budget_allotment: existingCycle.budget_allotment?.toString() || '',
      });
    } else {
      // Auto-increment cycle number for new cycles
      if (existingCycles && existingCycles.length > 0) {
        const maxNum = Math.max(...existingCycles.map(c => c.cycle_number), 0);
        setFormData(prev => ({ ...prev, cycle_number: maxNum + 1 }));
      } else {
        setFormData(prev => ({ ...prev, cycle_number: 1 }));
      }
    }
  }, [existingCycle, existingCycles]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isSubmittingRef.current) {
      return;
    }

    try {
      setIsSubmitting(true);
      isSubmittingRef.current = true;

      const url = '/api/v1/cycles';
      const method = existingCycle ? 'PUT' : 'POST';

      const payload: any = {
        cycle_name: `Cycle ${formData.cycle_number}`,
        cycle_number: formData.cycle_number,
        project_id: projectId,
        budget_allotment: formData.budget_allotment
          ? parseFloat(formData.budget_allotment)
          : null,
        ...(formData.start_date && { start_date: formData.start_date }),
        ...(formData.end_date && { end_date: formData.end_date }),
      };

      if (existingCycle) {
        payload.id = existingCycle.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.status === 'success') {
        toast.success(existingCycle ? 'Cycle updated successfully' : 'Cycle created successfully');
        onSuccess(data.cycle);
      } else {
        // If we get a "duplicate key" error, we show a user friendly message
        if (data.message && (data.message.includes('unique constraint') || data.message.includes('already exists'))) {
          const nextNumber = formData.cycle_number + 1;
          toast.error(`Cycle ${formData.cycle_number} already exists for this project. Try Cycle ${nextNumber} instead.`);
          // Auto-increment to next available number
          setFormData(prev => ({ ...prev, cycle_number: nextNumber }));
        } else {
          toast.error(data.message || (existingCycle ? 'Failed to update cycle' : 'Failed to create cycle'));
        }
        setIsSubmitting(false);
        isSubmittingRef.current = false;
      }
    } catch (error) {
      toast.error(existingCycle ? 'Failed to update cycle' : 'Failed to create cycle');
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground">
          Cycle Number
        </label>
        <Input
          type="number"
          placeholder="Enter cycle number"
          value={formData.cycle_number.toString()}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, cycle_number: parseInt(e.target.value) || 1 })
          }
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Start Date
          </label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, start_date: e.target.value })
            }
            required={!existingCycle} // Required on create
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">
            End Date
          </label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          {currentCurrencyCode
            ? `Budget Allotment (${currentCurrencyCode})`
            : 'Budget Allotment'}
        </label>
        <Input
          type="number"
          step="0.01"
          placeholder={
            currentCurrencyCode
              ? `Enter budget amount in ${currentCurrencyCode}`
              : 'Enter budget amount'
          }
          value={formData.budget_allotment}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, budget_allotment: e.target.value })
          }
        />
      </div>
      <DialogFooter className='pt-4'>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Back
        </Button>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {existingCycle ? 'Update Cycle' : 'Create Cycle'}
        </Button>
      </DialogFooter>
    </form>
  );
}

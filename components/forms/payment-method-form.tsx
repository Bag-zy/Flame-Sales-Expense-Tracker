"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switcher } from "@/components/ui/shadcn-io/navbar-12/Switcher";

interface PaymentMethodFormData {
  method_type: string;
  description: string;
}

interface EditablePaymentMethod {
  id: number;
  method_name: string;
  method_type?: string;
  description?: string;
}

interface PaymentMethodFormProps {
  editingMethod?: EditablePaymentMethod | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const methodTypes = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check",
  "Mobile Money",
  "Digital Wallet",
  "Other",
];

export function PaymentMethodForm({
  editingMethod,
  onSuccess,
  onCancel,
}: PaymentMethodFormProps) {
  const [formData, setFormData] = useState<PaymentMethodFormData>({
    method_type: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingMethod) {
      setFormData({
        method_type: editingMethod.method_type || editingMethod.method_name || "",
        description: editingMethod.description || "",
      });
    } else {
      setFormData({ method_type: "", description: "" });
    }
  }, [editingMethod]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    const params: any = {
      method_name: formData.method_type, // Use type as name
      ...(formData.description && { description: formData.description }),
    };

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: editingMethod ? "update_payment_method" : "add_payment_method",
          params: editingMethod
            ? { payment_method_id: editingMethod.id, ...params }
            : params,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        toast.success(
          editingMethod
            ? "Payment method updated successfully"
            : "Payment method created successfully"
        );
        onSuccess();
      } else {
        toast.error(data.message || "Operation failed");
      }
    } catch (error) {
      toast.error("Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Method Type
          </label>
          <Switcher
            items={methodTypes.map((type) => ({ value: type, label: type }))}
            value={formData.method_type}
            onChange={(value) => setFormData({ ...formData, method_type: value })}
            placeholder="Select type"
            searchPlaceholder="Search type..."
            emptyText="No method types found."
            widthClassName="w-full"
            allowClear={false}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          placeholder="Enter description"
          value={formData.description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {editingMethod ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

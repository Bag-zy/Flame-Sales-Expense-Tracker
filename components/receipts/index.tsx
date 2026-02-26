'use client';

import { useMemo, useState } from 'react';
import { Receipt as ReceiptIcon, Calendar, Store, DollarSign, Image as ImageIcon, Scan, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface Receipt {
  id: number;
  expense_id?: number;
  file_path?: string;
  upload_date: string;
  raw_text?: string;
  structured_data?: {
    vendor?: { name?: string };
    details?: { receipt_number?: string; date?: string };
    summary?: { total_due?: number };
  };
}

export interface ReceiptCardProps {
  receipt: Receipt;
  onViewImage?: (receipt: Receipt) => void;
  onViewOcr?: (receipt: Receipt) => void;
  onViewDetails?: (receipt: Receipt) => void;
}

export function ReceiptCard({
  receipt,
  onViewImage,
  onViewOcr,
  onViewDetails,
}: ReceiptCardProps) {
  const vendorName = receipt.structured_data?.vendor?.name || 'Unknown Vendor';
  const receiptNumber = receipt.structured_data?.details?.receipt_number || `Receipt #${receipt.id}`;
  const totalDue = receipt.structured_data?.summary?.total_due ?? 0;
  const date = receipt.structured_data?.details?.date || receipt.upload_date;
  const hasImage = !!receipt.file_path;
  const hasOcr = !!receipt.raw_text;

  return (
    <Card className="transition-all hover:shadow-md h-full flex flex-col">
      <CardHeader className="px-4 py-3 border-b border-border">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-semibold truncate">{receiptNumber}</CardTitle>
          <CardDescription className="text-xs truncate">{vendorName}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3 flex-1">
        <div className="text-2xl font-bold text-green-600">
          ${totalDue.toLocaleString()}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(date).toLocaleDateString()}
          </Badge>
          {hasImage && (
            <Badge variant="outline" className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200">
              <ImageIcon className="h-3 w-3" /> Image
            </Badge>
          )}
          {hasOcr && (
            <Badge variant="outline" className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <Scan className="h-3 w-3" /> OCR
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0 flex flex-wrap items-center gap-2">
        {onViewDetails && (
          <Button size="sm" variant="outline" onClick={() => onViewDetails(receipt)}>
            <Eye className="w-4 h-4 mr-1" />
            Details
          </Button>
        )}
        {onViewImage && hasImage && (
          <Button size="sm" variant="outline" onClick={() => onViewImage(receipt)}>
            <ImageIcon className="w-4 h-4 mr-1" />
            Image
          </Button>
        )}
        {onViewOcr && hasOcr && (
          <Button size="sm" variant="outline" onClick={() => onViewOcr(receipt)}>
            <Scan className="w-4 h-4 mr-1" />
            OCR
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export interface ReceiptListProps {
  receipts: Receipt[];
  onViewImage: (receipt: Receipt) => void;
  onViewOcr: (receipt: Receipt) => void;
  onViewDetails: (receipt: Receipt) => void;
  isLoading?: boolean;
}

export function ReceiptList({
  receipts,
  onViewImage,
  onViewOcr,
  onViewDetails,
  isLoading = false,
}: ReceiptListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReceipts = useMemo(() => {
    if (!searchTerm) return receipts;
    return receipts.filter((r) => {
      const vendorName = r.structured_data?.vendor?.name || '';
      const receiptNumber = r.structured_data?.details?.receipt_number || '';
      return (
        vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toString().includes(searchTerm)
      );
    });
  }, [receipts, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
          <ReceiptIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Receipts ({receipts.length})</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredReceipts.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              onViewImage={onViewImage}
              onViewOcr={onViewOcr}
              onViewDetails={onViewDetails}
            />
          ))}
          {filteredReceipts.length === 0 && (
            <div className="col-span-full">
              <div className="p-8 bg-card rounded-lg border border-border text-center text-muted-foreground">
                <ReceiptIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold mb-2">No receipts found</h3>
                <p>{searchTerm ? 'Try adjusting your search' : 'Upload receipts from the Expenses page to see them here.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

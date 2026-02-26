'use client'

import React from 'react'
import { ArrowLeft, Calendar, CheckCircle2, ClipboardList, Clock, Info, Package, PlayCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type ProductionOrderInput = {
    id: number
    input_inventory_item_variant_id: number
    quantity_required: number
    unit_cost_override: number | null
    itemName?: string
    variantLabel?: string
}

type ProductionOrder = {
    id: number
    status: string
    output_inventory_item_variant_id: number
    output_quantity: number
    output_unit_cost: number | null
    notes: string | null
    created_at: string
    completed_at: string | null
    inputs: ProductionOrderInput[]
}

interface ProductionOrderDetailsProps {
    order: ProductionOrder
    onBack: () => void
    onComplete: (id: number) => void
    onDelete: (id: number) => void
    variantById: Map<number, { itemName: string; label: string }>
}

export function ProductionOrderDetails({
    order,
    onBack,
    onComplete,
    onDelete,
    variantById
}: ProductionOrderDetailsProps) {
    const outputVariant = variantById.get(Number(order.output_inventory_item_variant_id))

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Completed</Badge>
            case 'IN_PROGRESS':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">In Progress</Badge>
            default:
                return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Production Order #{order.id}</h1>
                        {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                        Created on {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex gap-2">
                    {order.status !== 'COMPLETED' && (
                        <Button onClick={() => onComplete(order.id)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Complete Order
                        </Button>
                    )}
                    <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(order.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            <CardTitle>Output Details</CardTitle>
                        </div>
                        <CardDescription>The final product being produced from this order.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start justify-between p-4 bg-muted/40 rounded-lg border border-border/50">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Product</span>
                                <h3 className="text-lg font-bold">{outputVariant?.itemName || 'Unknown Item'}</h3>
                                <p className="text-sm text-muted-foreground">{outputVariant?.label || 'Default Variant'}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Production Quantity</span>
                                <div className="text-2xl font-black text-primary">
                                    {Number(order.output_quantity).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Required Inputs</h3>
                            </div>
                            <div className="rounded-md border border-border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="text-left py-3 px-4 font-medium uppercase text-[10px] tracking-wider">Resource / Material</th>
                                            <th className="text-right py-3 px-4 font-medium uppercase text-[10px] tracking-wider">Required Qty</th>
                                            <th className="text-right py-3 px-4 font-medium uppercase text-[10px] tracking-wider">Unit Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {order.inputs.map((input) => {
                                            const inputVariant = variantById.get(Number(input.input_inventory_item_variant_id))
                                            return (
                                                <tr key={input.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold">{inputVariant?.itemName || 'Material'}</div>
                                                        <div className="text-xs text-muted-foreground">{inputVariant?.label || 'Default'}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono font-medium">
                                                        {Number(input.quantity_required).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono">
                                                        {input.unit_cost_override ? Number(input.unit_cost_override).toLocaleString() : '—'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            <CardTitle>Information</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center">
                                    <Clock className="h-4 w-4 mr-2" /> Status
                                </span>
                                <span className="font-medium">{order.status}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center">
                                    <PlayCircle className="h-4 w-4 mr-2" /> Initial Stage
                                </span>
                                <span className="font-medium">Started</span>
                            </div>
                            <Separator />
                            {order.completed_at && (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center">
                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Completed
                                        </span>
                                        <span className="font-medium">{new Date(order.completed_at).toLocaleDateString()}</span>
                                    </div>
                                    <Separator />
                                </>
                            )}
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Internal Notes</span>
                            <div className="p-3 bg-muted/30 rounded border border-dashed text-sm italic text-muted-foreground">
                                {order.notes || 'No notes added to this order.'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


import { CustomerDetailsView } from '@/components/customer-details-view';

export default function CustomerPage({ params }: { params: { id: string } }) {
    return <CustomerDetailsView customerId={params.id} backHref="/sales-management" />;
}

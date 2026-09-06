import BillingPageClient from './BillingPageClient';
import { getVietnamMonthRange } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
  // One server value also initializes hydration, including across month boundaries.
  return <BillingPageClient initialRange={getVietnamMonthRange()} />;
}

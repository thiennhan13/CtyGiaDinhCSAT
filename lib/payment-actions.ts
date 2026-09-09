import { createClient } from '@/lib/supabase/server';
import type { BillingPayment } from '@/lib/billing-report';
export async function recordOutstandingPayment(paymentId: string) {
  const supabase = await createClient();
  const account = await supabase.rpc('payment_accounts', { p_payment_id: paymentId });
  if (account.error) throw account.error;
  const payment = (account.data as BillingPayment[])[0];
  if (!payment) throw new Error('Không tìm thấy chứng từ.');
  if (payment.balance < 0) throw new Error('Chứng từ cần hoàn tiền. Hãy dùng thao tác ghi nhận hoàn tiền trong trang chốt sổ.');
  const result = await supabase.rpc('record_payment_event', { p_payment_id: paymentId, p_request_id: crypto.randomUUID(), p_expected_balance: payment.balance });
  if (result.error) throw result.error;
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Phone, Search } from 'lucide-react';
import { normalizeParentPhone } from '@/lib/parents';

export function ParentLoginForm() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = normalizeParentPhone(phone);
    if (!clean) {
      setError('Vui lòng nhập số di động Việt Nam, bắt đầu bằng 0 hoặc +84.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/parents/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra.');
      }
      
      router.replace('/parents');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="parent-phone" className="text-sm font-semibold text-foreground">
          Số điện thoại Phụ huynh
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="parent-phone"
            type="tel"
            inputMode="numeric"
            placeholder="0912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            maxLength={30}
            className="pl-9 h-11 bg-background border border-input rounded-xl text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Nhập số điện thoại đã đăng ký với trung tâm CSAT
        </p>
      </div>


      {/* Info box */}
      <div className="flex items-start gap-2 bg-secondary border border-border rounded-lg p-3 text-[13px] text-muted-foreground">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <span>Nhập số điện thoại đã được CSAT mở tra cứu để xem thông tin học tập. Nếu chưa tra cứu được, vui lòng liên hệ trung tâm.</span>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 text-[13px] text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="csat-btn csat-btn--primary w-full h-11 flex justify-center items-center text-[0.95em]"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Đang tra cứu...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Tra cứu thông tin
          </>
        )}
      </button>
    </form>
  );
}


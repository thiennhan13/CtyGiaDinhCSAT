'use client';

import { useEffect, useRef, useState } from 'react';

export type LoginCaptchaConfig = { enabled: boolean; siteKey: string };
type Turnstile = {
  ready: (callback: () => void) => void;
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<Turnstile> | undefined;

function loadTurnstile() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = window.setTimeout(fail, 12000);
    function fail() {
      window.clearTimeout(timer); script.remove(); scriptPromise = undefined;
      reject(new Error('Verification unavailable'));
    }
    function ready() {
      const api = window.turnstile;
      if (!api) { fail(); return; }
      api.ready(() => { window.clearTimeout(timer); resolve(api); });
    }
    if (window.turnstile) { ready(); return; }
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true; script.onload = ready; script.onerror = fail;
    document.head.append(script);
  });
  return scriptPromise;
}

export function LoginCaptcha({ siteKey, action, onToken }: {
  siteKey: string; action: 'parent_login' | 'staff_login'; onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('Đang tải xác minh bảo mật…');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false, widget: string | undefined, api: Turnstile | undefined;
    let observer: ResizeObserver | undefined;
    let size: 'compact' | 'flexible' | undefined;
    onToken('');
    setFailed(false);
    setMessage('Đang tải xác minh bảo mật…');
    const fail = () => {
      if (disposed) return;
      onToken(''); setFailed(true); setMessage('Chưa xác minh được. Vui lòng thử lại hoặc liên hệ CSAT.');
    };
    if (!siteKey) fail();
    else loadTurnstile().then(value => {
      if (disposed || !container.current) return;
      api = value;
      const render = () => {
        if (disposed || !container.current || !api) return;
        const nextSize = container.current.clientWidth < 300 ? 'compact' : 'flexible';
        if (widget !== undefined && nextSize === size) return;
        if (widget !== undefined) api.remove(widget);
        onToken(''); size = nextSize; setMessage('Vui lòng hoàn tất xác minh bảo mật.');
        widget = api.render(container.current, {
        sitekey: siteKey, action, language: 'vi', theme: 'auto',
        size,
        'response-field': false,
        callback: (token: string) => { if (!disposed) { onToken(token); setMessage(''); setFailed(false); } },
        'expired-callback': () => { if (!disposed) { onToken(''); setMessage('Xác minh đã hết hạn. Vui lòng xác minh lại.'); } },
        'timeout-callback': fail,
        'error-callback': () => { fail(); return true; },
        });
      };
      render();
      observer = new ResizeObserver(() => { try { render(); } catch { fail(); } });
      observer.observe(container.current);
    }).catch(fail);
    return () => { disposed = true; observer?.disconnect(); if (widget !== undefined) api?.remove(widget); onToken(''); };
  }, [siteKey, action, onToken, retry]);

  return <div className="space-y-2" data-login-captcha>
    <div ref={container} className="min-h-16 w-full" aria-label="Xác minh bảo mật Cloudflare" />
    <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{message}</p>
    {failed && siteKey && <button type="button" className="text-sm font-semibold text-primary underline underline-offset-4" onClick={() => setRetry(value => value + 1)}>Thử lại xác minh</button>}
  </div>;
}

export function useLoginCaptcha(config: LoginCaptchaConfig | undefined, active: boolean, action: 'parent_login' | 'staff_login') {
  const [token, setToken] = useState('');
  const [generation, setGeneration] = useState(0);
  return {
    ready: !config?.enabled || (active && !!token),
    token: config?.enabled ? token : undefined,
    reset: () => { setToken(''); setGeneration(value => value + 1); },
    widget: config?.enabled && active ? <LoginCaptcha key={generation} siteKey={config.siteKey} action={action} onToken={setToken} /> : null,
  };
}

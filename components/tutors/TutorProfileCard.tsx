'use client';
import { useEffect, useRef, useState } from 'react';
import type { TutorProfile } from '@/lib/tutor-profile';

type CardProfile = Pick<TutorProfile, 'name' | 'introduction' | 'background' | 'major' | 'university' | 'achievements'> & { avatar_url?: string | null };
function Avatar({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // An SSR image can fail before React attaches onError during hydration.
    if (image.current?.complete && image.current.naturalWidth === 0) setFailed(true);
  }, [url]);
  return <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-secondary text-2xl font-extrabold" aria-hidden="true">
    {url && !failed ? /* The image is already normalized to 512px; no remote optimizer needed. */
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={image} src={url} alt="" width={80} height={80} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      : <span className="flex h-full items-center justify-center">{name.trim().split(/\s+/).slice(-1)[0]?.slice(0, 1) || 'CS'}</span>}
  </div>;
}
export function TutorProfileCard({ profile, classes = [] }: { profile: CardProfile; classes?: string[] }) {
  return <article className="min-w-0 space-y-4 rounded-xl border p-4 [overflow-wrap:anywhere] print:break-inside-avoid">
    <div className="flex items-center gap-4"><Avatar key={profile.avatar_url} url={profile.avatar_url} name={profile.name} /><div className="min-w-0"><h3 className="text-lg font-bold">{profile.name || 'Chưa phân gia sư'}</h3>{classes.length > 0 && <p className="mt-1 text-xs text-primary">{classes.join(' · ')}</p>}</div></div>
    {profile.introduction && <p className="whitespace-pre-wrap text-sm leading-7">{profile.introduction}</p>}
    {profile.background && <p className="text-sm leading-6">{profile.background}</p>}
    {(profile.major || profile.university) && <p className="text-sm leading-6">{[profile.major, profile.university].filter(Boolean).join(' · ')}</p>}
    {profile.achievements && <div><h4 className="mb-2 text-sm font-bold">Thành tích cá nhân</h4><ul className="list-disc space-y-1 pl-5 text-sm leading-6">{profile.achievements.split('\n').map(s => s.trim()).filter(Boolean).map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
  </article>;
}

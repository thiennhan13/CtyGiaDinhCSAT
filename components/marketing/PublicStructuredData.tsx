import { structuredDataJson } from '@/lib/public-structured-data';

/** Server-rendered metadata only; never accepts private Portal records. */
export function PublicStructuredData({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredDataJson(data) }} />;
}

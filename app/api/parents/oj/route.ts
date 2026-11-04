import { readOJAccount } from '@/lib/oj-account-api';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function GET(request: Request) { return readOJAccount(request, true); }

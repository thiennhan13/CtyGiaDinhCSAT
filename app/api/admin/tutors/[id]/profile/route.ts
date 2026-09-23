import { getTutorProfile, saveTutorProfile } from '@/lib/tutor-profile-api';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { return getTutorProfile((await context.params).id); }
export async function PUT(request: Request, context: Context) { return saveTutorProfile(request, (await context.params).id); }

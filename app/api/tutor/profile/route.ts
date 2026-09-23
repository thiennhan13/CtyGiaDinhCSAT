import { getTutorProfile, saveTutorProfile } from '@/lib/tutor-profile-api';
export const runtime = 'nodejs';
export const GET = () => getTutorProfile();
export const PUT = (request: Request) => saveTutorProfile(request);

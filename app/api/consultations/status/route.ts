import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export function GET(){
 return NextResponse.json({enabled:process.env.CONSULTATIONS_ENABLED==='true'&&Boolean(process.env.CONSULTATIONS_HASH_KEY)},{headers:{'Cache-Control':'no-store'}});
}

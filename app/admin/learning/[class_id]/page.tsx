import { LearningWorkspace } from '@/components/learning/LearningWorkspace';
import { monthSchema } from '@/lib/learning';
export default async function Page({searchParams}:{searchParams:Promise<{month?:string}>}){
 const p=monthSchema.safeParse((await searchParams).month);
 return <LearningWorkspace admin initialMonth={p.success?p.data:undefined}/>;
}

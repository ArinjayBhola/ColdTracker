import { auth } from "@/lib/auth";
import { readTemplate } from "@/lib/template-query";
import { z } from "zod";

export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) {
  const headers={"Cache-Control":"private, no-store"};
  const session=await auth();
  if(!session?.user?.id)return Response.json({error:"Sign in required"},{status:401,headers});
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return Response.json({error:"Invalid template"},{status:400,headers});
  try{
    const template=await readTemplate(session.user.id,id);
    return template ? Response.json(template,{headers}) : Response.json({error:"Template not found"},{status:404,headers});
  }catch{return Response.json({error:"Could not load template"},{status:503,headers});}
}

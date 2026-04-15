import { db } from "@/db/index";
import { extensionLeads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const CONTACT_METHODS = new Set(["EMAIL", "LINKEDIN"]);

async function resolveUserId(req: Request): Promise<string | undefined> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const hasBearer = req.headers.get("authorization")?.startsWith("Bearer ");

  // Extension sends Bearer with the full JWE (from possibly chunked cookies). Try this first.
  if (secret && hasBearer) {
    let payload = await getToken({ req, secret, secureCookie: true });
    if (!payload) payload = await getToken({ req, secret, secureCookie: false });
    if (payload?.sub) return payload.sub;
  }

  if (!secret) return undefined;

  const session = await auth();
  return session?.user?.id;
}

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");
  // Mirroring origin is essential for requests with credentials/headers
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
};

export async function OPTIONS(req: Request) {
  const headers = getCorsHeaders(req);
  console.log(`[EXTENSION_OPTIONS] Origin: ${req.headers.get("origin")}, Returning Headers:`, headers);
  return new NextResponse(null, {
    status: 204,
    headers: headers,
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  console.log(`[EXTENSION_POST] Request from Origin: ${origin}`);
  
  try {
    // DIAGNOSTIC 1: Check Environment
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error("[EXTENSION_POST] CRITICAL: DATABASE_URL is missing from environment variables.");
        return NextResponse.json({ error: "Server Configuration Error: Database connection string is missing." }, { status: 500 });
    }
    
    const userId = await resolveUserId(req);

    if (!userId) {
      console.warn("[EXTENSION_POST] Authentication failed - returning Unauthorized JSON");
      return NextResponse.json({ 
        error: "Unauthorized: Please log in at https://cold-tracker-mu.vercel.app to capture leads." 
      }, { 
        status: 401,
        headers: getCorsHeaders(req) 
      });
    }

    const body = await req.json();
    const { profileUrl, companyName, companyUrl, position, personRole, personName: scrapedName, emailAddress, contactMethod: rawContact } = body;
    const contactMethod =
      typeof rawContact === "string" && CONTACT_METHODS.has(rawContact.toUpperCase())
        ? rawContact.toUpperCase()
        : "LINKEDIN";

    if (!profileUrl) {
      return new NextResponse("Profile URL is required", { 
        status: 400,
        headers: getCorsHeaders(req)
      });
    }

    // Extract name: Prefer scrapedName from extension, fallback to URL parsing
    let personName = scrapedName && scrapedName.trim() !== '' ? scrapedName : "Unknown";
    
    if (personName === "Unknown") {
      try {
        const url = new URL(profileUrl);
        const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
        if (pathParts[0] === "in" && pathParts[1]) {
          const slug = pathParts[1];
          personName = slug
            .split("-")
            .filter((part) => !/^\d+$/.test(part))
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        }
      } catch (e) {
        console.error("[EXTENSION_POST] Name extraction failed:", e);
      }
    }

    let newLead;
    try {
        console.log("[EXTENSION_POST] Attempting DB insert for user:", userId);
        const results = await db
          .insert(extensionLeads)
          .values({
            userId: userId,
            profileUrl,
            personName,
            companyName: companyName || null,
            companyUrl: companyUrl || null,
            position: position || "Job inquiry",
            personRole: personRole || null,
            emailAddress: emailAddress || null,
            contactMethod: contactMethod as "EMAIL" | "LINKEDIN",
            outreachDate: new Date(),
          })
          .returning();
        
        newLead = results[0];
    } catch (dbError: any) {
        console.error("[EXTENSION_POST] Database Insertion Error:", dbError);
        return NextResponse.json({ 
            error: `Database Error: ${dbError.message}. Check if extension_leads table exists and fields match.` 
        }, { 
            status: 500,
            headers: getCorsHeaders(req)
        });
    }

    if (!newLead) {
      return NextResponse.json({ 
        error: "Database Insert succeeded but no record was returned. Check if the database supports .returning()" 
      }, { 
        status: 500,
        headers: getCorsHeaders(req)
      });
    }

    console.log(`[EXTENSION_POST] Successfully saved lead: ${personName}`);

    return NextResponse.json(newLead, {
        headers: getCorsHeaders(req)
    });
  } catch (error: any) {
    console.error("[EXTENSION_POST] Top-level critical error:", error);
    return NextResponse.json({ 
        error: `Critical Error: ${error.message || "Unknown error"}. Trace available in server logs.` 
    }, { 
        status: 500,
        headers: getCorsHeaders(req)
    });
  }
}

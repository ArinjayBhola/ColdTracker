import { db } from "@/db/index";
import { extensionLeads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

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
  const authHeader = req.headers.get("authorization");
  
  console.log(`[EXTENSION_POST] Request from Origin: ${origin}`);
  
  try {
    // DIAGNOSTIC 1: Check Environment
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
        console.error("[EXTENSION_POST] CRITICAL: DATABASE_URL is missing from environment variables.");
        return NextResponse.json({ error: "Server Configuration Error: Database connection string is missing." }, { status: 500 });
    }
    
    if (!secret) {
        console.warn("[EXTENSION_POST] WARNING: No AUTH_SECRET or NEXTAUTH_SECRET found. Manual token decoding will fail.");
    }
    
    let userId: string | undefined;

    // 1. Try standard session (works if cookies are sent)
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    } 
    // 2. Fallback: manually decode token from Authorization header
    else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
      
      if (!secret) {
        console.error("[EXTENSION_POST] Critical: No AUTH_SECRET or NEXTAUTH_SECRET provided in environment. Token decoding failed.");
      } else {
        try {
            const decoded = await decode({ 
              token, 
              secret,
              salt: origin?.includes("cold-tracker-mu.vercel.app") ? "__Secure-authjs.session-token" : "authjs.session-token"
            });
            if (decoded?.sub) {
              userId = decoded.sub as string;
            }
        } catch (decodeError) {
            console.error("[EXTENSION_POST] JWT Decode Error:", decodeError);
        }
      }
    }

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
    const { profileUrl, companyName, companyUrl, position, personRole, personName: scrapedName, emailAddress, contactMethod } = body;

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
            contactMethod: (contactMethod as any) || "LINKEDIN",
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

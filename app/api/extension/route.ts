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
        console.error("[EXTENSION_POST] No AUTH_SECRET or NEXTAUTH_SECRET found in env");
      } else {
        const decoded = await decode({ 
          token, 
          secret,
          salt: req.url.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token"
        });
        if (decoded?.sub) {
          userId = decoded.sub as string;
        }
      }
    }

    if (!userId) {
      return new NextResponse("Unauthorized", { 
        status: 401,
        headers: getCorsHeaders(req) 
      });
    }

    const body = await req.json();
    const { profileUrl, companyName, companyUrl, position } = body;

    if (!profileUrl) {
      return new NextResponse("Profile URL is required", { 
        status: 400,
        headers: getCorsHeaders(req)
      });
    }

    // Extract name from LinkedIn URL
    let personName = "Unknown";
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
      console.error("Error extracting name from URL:", e);
    }

    const [newLead] = await db
      .insert(extensionLeads)
      .values({
        userId: userId,
        profileUrl,
        personName,
        companyName: companyName || null,
        companyUrl: companyUrl || null,
        position: position || "Job inquiry",
      })
      .returning();

    console.log(`[EXTENSION_POST] Successfully saved lead: ${personName}`);

    return NextResponse.json(newLead, {
        headers: getCorsHeaders(req)
    });
  } catch (error) {
    console.error("[EXTENSION_POST] Internal Error:", error);
    return new NextResponse("Internal Server Error", { 
        status: 500,
        headers: getCorsHeaders(req)
    });
  }
}

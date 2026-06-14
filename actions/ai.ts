"use server";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import * as cheerio from "cheerio";

// Initialize OpenAI client pointing to OpenRouter's API
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "YOUR_API_KEY_HERE",
});

export async function generateEmailDraftAction(data: {
  companyName: string;
  companyUrl?: string;
  position: string;
  personName: string;
  personRole: string;
}) {
  try {
    let scrapedContext = "No additional context available.";

    // Attempt to scrape the company URL if provided
    if (data.companyUrl) {
      try {
        let url = data.companyUrl;
        if (!url.startsWith("http")) {
          url = `https://${url}`;
        }
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ColdTrackerBot/1.0)",
          },
          signal: AbortSignal.timeout(5000), // 5 seconds timeout
        });
        
        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);
          
          // Remove scripts, styles, and nav to just get main content
          $("script, style, nav, footer, header").remove();
          
          // Get text and clean it up, grab first 1000 characters
          const text = $("body").text().replace(/\s+/g, " ").trim();
          scrapedContext = text.substring(0, 1500);
        }
      } catch (e) {
        console.warn("Failed to scrape company URL:", e);
        // Continue without scraped context if fetch fails
      }
    }

    const prompt = `
You are an expert recruiter and career coach. Your task is to draft a personalized cold outreach email.

**Context:**
- Target Person: ${data.personName}
- Target Person's Role: ${data.personRole}
- Company Name: ${data.companyName}
- Target Position applying for: ${data.position}

**Company Website Scraped Data:**
${scrapedContext}

**Guidelines:**
1. The tone must be human, conversational, and professional.
2. The length should be perfect—not too short, not too long (around 3-4 paragraphs max).
3. Do NOT use any em dashes (—) or hyphens to substitute for em dashes.
4. Structure the output as JSON with "subject" and "body" keys.

Return ONLY a valid JSON object in this format, and absolutely nothing else:
{
  "subject": "Email subject here",
  "body": "Email body here. Use line breaks where necessary."
}
`;

    const { text } = await generateText({
      model: openrouter("nousresearch/hermes-3-llama-3.1-405b"),
      prompt: prompt,
    });

    let result;
    try {
      // Parse the JSON output
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanText);
    } catch {
      console.error("Failed to parse LLM output:", text);
      return { success: false, error: "The AI returned an invalid format. Please try again." };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to generate email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate email" };
  }
}

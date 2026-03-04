import { google } from "googleapis";

type SendGmailParams = {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
};

export async function sendViaGmail({
  accessToken,
  to,
  subject,
  htmlBody,
  from,
}: SendGmailParams): Promise<{ success: boolean; error?: string }> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build RFC 2822 MIME message
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ...(from ? [`From: ${from}`] : []),
    "",
    htmlBody,
  ];

  const rawMessage = messageParts.join("\r\n");

  // Base64url encode the message
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Failed to send email via Gmail",
    };
  }
}

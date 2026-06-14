import { google } from "googleapis";

type SendGmailParams = {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
  from?: string;
  attachments?: { name: string; type: string; content: string }[];
};

export async function sendViaGmail({
  accessToken,
  to,
  subject,
  htmlBody,
  from,
  attachments = [],
}: SendGmailParams): Promise<{ success: boolean; error?: string }> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  let messageParts: string[] = [];

  if (attachments.length > 0) {
    const boundary = `coldtrack_boundary_${Math.random().toString(36).substring(2)}`;

    messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      ...(from ? [`From: ${from}`] : []),
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      "",
      htmlBody,
    ];

    for (const attachment of attachments) {
      messageParts.push(
        "",
        `--${boundary}`,
        `Content-Type: ${attachment.type}; name="${attachment.name}"`,
        `Content-Disposition: attachment; filename="${attachment.name}"`,
        `Content-Transfer-Encoding: base64`,
        "",
        attachment.content
      );
    }

    messageParts.push("", `--${boundary}--`);
  } else {
    // Build basic RFC 2822 MIME message
    messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ...(from ? [`From: ${from}`] : []),
      "",
      htmlBody,
    ];
  }

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
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as Error)?.message || "Failed to send email via Gmail",
    };
  }
}

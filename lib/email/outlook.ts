type SendOutlookParams = {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
};

export async function sendViaOutlook({
  accessToken,
  to,
  subject,
  htmlBody,
}: SendOutlookParams): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: htmlBody,
          },
          toRecipients: [
            {
              emailAddress: { address: to },
            },
          ],
        },
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    return {
      success: false,
      error:
        errorData?.error?.message || "Failed to send email via Outlook",
    };
  }

  return { success: true };
}

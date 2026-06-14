type SendOutlookParams = {
  accessToken: string;
  to: string;
  subject: string;
  htmlBody: string;
  attachments?: { name: string; type: string; content: string }[];
};

export async function sendViaOutlook({
  accessToken,
  to,
  subject,
  htmlBody,
  attachments = [],
}: SendOutlookParams): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageData: any = {
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
  };

  if (attachments.length > 0) {
    messageData.message.attachments = attachments.map((att) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.name,
      contentType: att.type,
      contentBytes: att.content,
    }));
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messageData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errorData?.error?.message || "Failed to send email via Outlook",
    };
  }

  return { success: true };
}

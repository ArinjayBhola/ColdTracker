import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDailyOutreachReminder(to: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'ColdTracker <notifications@resend.dev>', // Replace with your verified domain
      to: [to],
      subject: 'Daily Outreach Reminder 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Hi ${name},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #334155;">
            You haven't uploaded any outreach activity today. Consistency is key to landing your dream role!
          </p>
          <div style="margin-top: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/outreach/new" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Log Today's Outreach
            </a>
          </div>
          <p style="margin-top: 40px; font-size: 14px; color: #64748b;">
            Happy tracking,<br>
            The ColdTracker Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending daily outreach reminder email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error sending daily outreach reminder email:', error);
    return { success: false, error };
  }
}

export async function sendFollowUpReminder(to: string, name: string, pendingCount: number) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'ColdTracker <notifications@resend.dev>', // Replace with your verified domain
      to: [to],
      subject: `Pending Follow-ups Reminder (${pendingCount}) 📬`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Hi ${name},</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #334155;">
            You have <strong>${pendingCount}</strong> follow-up${pendingCount > 1 ? 's' : ''} due today or overdue. 
            Don't let these opportunities slip away!
          </p>
          <div style="margin-top: 30px;">
            <a href="${process.env.NEXTAUTH_URL}/follow-ups" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Follow-up Queue
            </a>
          </div>
          <p style="margin-top: 40px; font-size: 14px; color: #64748b;">
            Happy tracking,<br>
            The ColdTracker Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending follow-up reminder email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error sending follow-up reminder email:', error);
    return { success: false, error };
  }
}

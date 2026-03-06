import { google } from "googleapis";

type CalendarEventParams = {
  accessToken: string;
  summary: string;
  description?: string;
  date: Date; // The follow-up due date
};

type UpdateCalendarEventParams = CalendarEventParams & {
  eventId: string;
};

function getCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createCalendarEvent({
  accessToken,
  summary,
  description,
  date,
}: CalendarEventParams): Promise<{ eventId: string | null; error?: string }> {
  const calendar = getCalendarClient(accessToken);

  // Create an all-day event on the follow-up date
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        start: { date: formatDate(startDate) },
        end: { date: formatDate(endDate) },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 60 * 9 }, // 9 AM morning of
          ],
        },
        colorId: "7", // Peacock (teal) color
      },
    });

    return { eventId: event.data.id || null };
  } catch (error: any) {
    console.error("Failed to create calendar event:", error?.message);
    return { eventId: null, error: error?.message || "Failed to create calendar event" };
  }
}

export async function updateCalendarEvent({
  accessToken,
  eventId,
  summary,
  description,
  date,
}: UpdateCalendarEventParams): Promise<{ success: boolean; error?: string }> {
  const calendar = getCalendarClient(accessToken);

  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  try {
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary,
        description,
        start: { date: formatDate(startDate) },
        end: { date: formatDate(endDate) },
      },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update calendar event:", error?.message);
    return { success: false, error: error?.message || "Failed to update calendar event" };
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const calendar = getCalendarClient(accessToken);

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
    return { success: true };
  } catch (error: any) {
    // If event already deleted, treat as success
    if (error?.code === 410 || error?.code === 404) {
      return { success: true };
    }
    console.error("Failed to delete calendar event:", error?.message);
    return { success: false, error: error?.message || "Failed to delete calendar event" };
  }
}

export async function listUpcomingEvents(
  accessToken: string,
  maxResults: number = 50
): Promise<{ events: any[]; error?: string }> {
  const calendar = getCalendarClient(accessToken);

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
      q: "[ColdTrack]", // Only fetch ColdTrack events
    });

    return { events: response.data.items || [] };
  } catch (error: any) {
    console.error("Failed to list calendar events:", error?.message);
    return { events: [], error: error?.message || "Failed to list events" };
  }
}

// Define Domain Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarId: string;
  backgroundColor: string;
}

// Google API helper to reduce duplication
async function googleFetch(endpoint: string, accessToken: string) {
  const url = endpoint.startsWith('http') ? endpoint : `https://www.googleapis.com/calendar/v3${endpoint}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Google API error: ${res.statusText}`);
  }
  return res.json();
}

export async function getCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  // 1. Fetch calendar list
  const listData = await googleFetch('/users/me/calendarList', accessToken);
  const calendars = listData.items || [];

  // 2. Fetch events for each calendar
  const eventsPromises = calendars.map(async (calendar: any) => {
    try {
      const endpoint = `/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
      const data = await googleFetch(endpoint, accessToken);
      
      const rawEvents = data.items || [];
      
      // 3. Map to domain format and filter invalid ones
      return rawEvents
        .filter((e: any) => e.start && e.end) // Remove completely malformed
        .map((e: any): CalendarEvent | null => {
          const startStr = e.start.dateTime || e.start.date;
          const endStr = e.end.dateTime || e.end.date;
          
          if (!startStr || !endStr) return null;

          return {
            id: e.id,
            title: e.summary || 'Untitled Event',
            start: new Date(startStr),
            end: new Date(endStr),
            allDay: !e.start.dateTime,
            calendarId: calendar.id,
            backgroundColor: calendar.backgroundColor || '#3174ad'
          };
        })
        .filter(Boolean) as CalendarEvent[];
    } catch (err) {
      console.warn(`Failed to fetch events for calendar ${calendar.id}`, err);
      // If one secondary calendar fails (e.g. permissions), we just return empty for it 
      // instead of crashing the whole dashboard.
      return []; 
    }
  });

  const allEvents = await Promise.all(eventsPromises);
  return allEvents.flat();
}

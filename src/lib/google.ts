export async function getCalendarEvents(accessToken: string, timeMin: string, timeMax: string) {
  // 1. Fetch calendar list
  const listRes = await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (!listRes.ok) throw new Error('Failed to fetch calendar list');
  const listData = await listRes.json();
  const calendars = listData.items || [];

  // 2. Fetch events for each calendar
  const eventsPromises = calendars.map(async (calendar: any) => {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store'
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    // Tag events with calendar color or id
    return (data.items || []).map((event: any) => ({
      ...event,
      calendarId: calendar.id,
      backgroundColor: calendar.backgroundColor
    }));
  });

  const allEvents = await Promise.all(eventsPromises);
  return allEvents.flat();
}

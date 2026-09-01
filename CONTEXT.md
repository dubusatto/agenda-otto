# Agenda Otto

A vibrant, colorful, and interactive calendar application integrating Google Calendar and Google Tasks.

## Language

**Calendar Source**:
A specific calendar feed provided by the Google Calendar API (e.g., "Primary", "Work", "Holidays"). Multiple sources are aggregated and displayed together in the Agenda, differentiated by the color-coding system.

**Scheduled Task**:
A Task that has been assigned a specific time slot on the Agenda. It exists only within the application's state and is not synced back to Google Calendar as an Event. Defaults to a 30-minute duration.

**Event**:
A scheduled block of time synchronized with Google Calendar.
_Avoid_: Compromisso, Appointment

**Task**:
An actionable item synchronized with Google Tasks that can be scheduled onto the calendar via drag and drop.
_Avoid_: Todo, Afazer

**Semantic Color-coding**:
The automated visual styling where Tasks and Events are assigned specific vibrant colors based on context, keywords, or lists.

**Agenda**:
The main interactive interface (built with React/Next.js) where both Events and Tasks are visualized and manipulated.
_Avoid_: Tela inicial, Painel

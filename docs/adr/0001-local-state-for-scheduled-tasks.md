# Local State for Scheduled Tasks

We decided that when a user drags a Google Task onto the calendar, it will only be saved in our application's database as a "Scheduled Task". It will not be synced back to Google Calendar as an Event.

This decision was made to allow users to visually plan their tasks on a calendar without cluttering their official Google Calendar, which is often shared with coworkers or family members. It also gives us more flexibility to apply custom styling and behaviors (like our opinionated color system) without being constrained by the Google Calendar API data model.

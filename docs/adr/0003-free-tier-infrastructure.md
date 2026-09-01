# Free Tier Infrastructure

**Constraint:** The application must be built using services and infrastructure that offer robust free tiers suitable for personal or small internal company use.

We decided that all architectural choices (hosting, database, auth) must not incur monthly fixed costs for low-volume usage. For example:
- **Hosting:** Vercel (Hobby/Free tier)
- **Database:** Supabase or Neon (Free tier for PostgreSQL)
- **Authentication:** NextAuth (Self-hosted/Free)

This decision ensures the project remains accessible and financially viable as a personal or internal tool without requiring budget approvals.

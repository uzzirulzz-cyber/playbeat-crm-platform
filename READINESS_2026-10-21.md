# CRM release-readiness checklist

- Build must generate the Prisma client and compile the Next.js application without changing a database schema.
- Schema changes must be reviewed and run as a separate, explicitly approved migration against a backed-up staging database first.
- Validate authentication, role permissions, tenant isolation, and lead-management workflows in a test environment.
- Verify environment variable names without committing credentials.
- Check dependency licenses, source ownership, and transfer exclusions before offering this software to buyers.
- Do not merge or deploy until isolated CI and human review pass.

Status: NOT certified for sale. This document records gates only; no build or test has been executed.

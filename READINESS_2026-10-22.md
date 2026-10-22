# Release readiness — 2026-10-22

## Safety change
- The default `npm run build` now generates Prisma Client and runs Next.js build **without modifying the database schema**.
- The explicit `npm run db:push` command no longer permits automatic data loss. Treat schema changes as separately reviewed migrations, backed up and executed in staging first.
- No schema migration, production database access, or deployment is performed by this change.

## Verification required before merge or commercial listing
1. Run `npm ci` (or the repository's documented package manager) in an isolated environment with no production credentials.
2. Run `npm run build` with mock or staging environment variables and record exit status. Confirm there is no `prisma db push` invocation.
3. Run `npm run lint` and a relevant smoke test for sign-in, roles, customer records, leads and payment/communication connectors.
4. Inspect the environment variable template and perform secret scanning; rotate any leaked credentials.
5. Check dependency licenses, bundled templates, images, integrations, and any third-party code before transfer.
6. Verify the demo and sales package separately; a Vercel READY state is not proof of correct behavior.

Status: **not sale-ready**. No independent build/test evidence or ownership/licensing certification is included in this branch.

---
name: database-incident-recovery-procedures
description: Use when the production database goes down, endpoints return Prisma errors like P2022 ColumnNotFound, P2021 TableNotFound, or when deployments fail during the Prisma migrate deploy step.
---

# Database Incident Recovery

## Overview
This skill provides the authoritative emergency protocol for restoring a disrupted database. The core principle: **Manual SQL mutation is vastly safer than automated Prisma fixes when schemas are desynchronized.**

## When to Use

- Application is throwing `P2022`, `P2021`, or other PrismaClientKnownRequestError codes in production logs.
- Deployments fail mid-build because `prisma migrate deploy` crashes on a Coolify or production database.
- You discover a migration was partially applied or marked applied when it wasn't.

**When NOT to use:**
- Developing features locally (use standard `prisma migrate dev`).
- Standard Prisma data queries within app code.

## The Iron Laws of Database Recovery

Violating these laws guarantees catastrophic data loss.

1. **NO BACKUP, NO KEYSTROKES.** You must copy the SQLite file to a `.bak` file before typing a single diagnostic command.
2. **NEVER USE `PRISMA DB PUSH` IN PROD.** It frequently drops tables entirely.
3. **NEVER USE `PRISMA MIGRATE RESET`.** It wipes the database.
4. **NEVER EDIT HISTORICAL `.SQL` FILES.** Altering past migrations throws checksum mismatch errors forever.

## Core Pattern: Direct SQLite Mutation

When Prisma fails perfectly aligning a schema, bypass Prisma. Use raw SQLite to patch the missing columns so Prisma Client stops crashing.

### ❌ BAD: Attempting Automated Fixes
```bash
# Drops the entire database
npx prisma migrate reset

# Often drops unmapped tables and accepts data loss automatically!
npx prisma db push --accept-data-loss
```

### ✅ GOOD: Manual Patching
```sql
-- Inject missing columns manually. Prisma only cares if the column exists!
ALTER TABLE installed_plugins ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT 1;
```

## Quick Reference: Recovery Protocol

| Step | Action | Required Command / Workflow |
|---|---|---|
| 1. Backup | Stop. Copy the DB file immediately. | `docker exec <id> cp /app/data/wwv.db /app/data/wwv.db.bak` |
| 2. Diagnose | Compare actual tables to Prisma expectation. | `sqlite3 /app/data/wwv.db '.schema my_table'` |
| 3. Resolve Logs | If Prisma is stuck on a failed migration loop. | `npx prisma migrate resolve --applied <name>` |
| 4. Patch SQL | Manually insert missing indices/columns. | `sqlite3 /app/data/wwv.db "ALTER TABLE..."` |

## Common Rationalizations & Red Flags

**RED FLAGS - STOP IMMEDIATELY**
- "I'll just run `db push` to sync it quickly."
- "There is no data we care about, I'll reset it."
- "I'll edit the failing `migration.sql` file and commit it."

If you find yourself thinking the above, you are about to destroy the database or break the deployment pipeline. Stop and use raw SQL.

| Excuse | Reality |
|--------|---------|
| "Resetting is the fastest way back online." | Resetting deletes production data. Never acceptable. |
| "I'll just edit the `migration.sql` to fix the `DROP INDEX`" | Prisma explicitly halts on checksum mismatches. Changing history breaks future deploys. |
| "I'll run `db push --accept-data-loss` because it's just throwing warnings." | `--accept-data-loss` can silently drop entire tables that drift slightly. |
| "I'm in a hurry, I don't need a backup." | Rushing a fix without a backup turns a 5-minute outage into a permanent one. |

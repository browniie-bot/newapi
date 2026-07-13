# Usage Report Billing Ledger Design

## Goal

Add an isolated usage-reporting module that lets administrators view all users and lets ordinary users view only their own usage. Reports support daily, weekly, monthly, and custom time ranges and expose provider, user, model, input/output/cache tokens, wallet charges, subscription consumption, total user fees, and a reserved supplier-cost field.

The module starts collecting data after deployment. Historical log backfill is explicitly out of scope.

## Accuracy Model

The report is backed by a new immutable billing ledger rather than inferred from usage logs. Only successfully settled billing events enter the ledger:

- `charge`: final successful request or task charge.
- `adjustment_charge`: a successful positive post-settlement adjustment.
- `refund`: a successful refund or negative adjustment.

Pre-consumption reservations are not reportable events. Reported fees are the signed net sum of confirmed ledger events. Token usage is attached only to the final consumption event so adjustments and refunds do not duplicate token totals.

Each business event has a stable idempotency key derived from its request or task identity and event kind. Retried settlement paths must return the existing ledger record rather than insert a duplicate.

## Isolation and Integration

The feature adds a dedicated backend slice:

- billing usage record model and migrations;
- ledger recording and compensation service;
- report query service;
- report controller and `/api/usage-report/*` routes;
- focused DTOs and tests.

It adds a dedicated frontend `usage-reports` feature, authenticated routes, and navigation entry. Existing usage logs, log APIs, and their UI remain unchanged.

Ledger recording is connected only to successful settlement boundaries. Where the authoritative balance/subscription mutation and ledger insert can share a database transaction, they must commit atomically. Where they cannot, settlement creates a durable pending event with a stable idempotency key; a retryable compensation worker confirms the ledger record. A plain best-effort dual write is not acceptable.

## Ledger Record

Every record snapshots the reporting dimensions and billing values that were true when the event occurred:

- event ID, idempotency key, request ID or task ID, event kind, and confirmation time;
- user ID and username snapshot;
- channel ID, channel name snapshot, and provider/channel-type snapshot;
- requested model and upstream model when model mapping was applied;
- input tokens, output tokens, cache-read tokens, cache-write tokens, and combined cache tokens;
- billing source (`wallet` or `subscription`);
- signed quota amount;
- quota-per-USD snapshot and signed USD amount at settlement time;
- record status and compensation metadata needed for reliable delivery.

Quota remains the authoritative representation of what the system deducted. The USD snapshot prevents later quota display configuration changes from rewriting historical monetary values. Monetary calculations use the project's decimal arithmetic conventions and avoid binary floating-point accumulation.

Supplier cost is not calculated in the first release. The API and UI reserve a nullable supplier-cost field and clearly render it as unconfigured. A later Excel-backed pricing adapter can calculate supplier cost without changing the report contract.

## Token Semantics

Input, output, and cache values use the normalized token semantics already established by the billing path. Cache reporting keeps read and write values separately and also returns a combined cache total. Provider-specific cache creation variants are normalized before the ledger event is created.

Non-token fixed-price tasks can legitimately have zero token counts while still carrying a fee. Refund and adjustment records have zero token counts because the original consumption event remains the source of usage volume.

## API and Authorization

The module exposes independent authenticated endpoints for summary/trend data, grouped detail rows, and filter options.

Administrators may query all users or select specific users. Ordinary users never supply an effective user scope: the backend always replaces it with the authenticated user ID. Authorization is enforced in the router/controller and repeated in the query service so a crafted request cannot access another user's records.

Queries support:

- presets for today, current week, and current month;
- explicit start and end timestamps;
- daily, weekly, or monthly bucket granularity;
- provider, user, model, and billing-source filters;
- server-side sorting and pagination for grouped detail rows.

Time buckets use the configured system timezone. Weeks begin on Monday. Query code groups from timestamps in a database-portable way and must support SQLite, MySQL, and PostgreSQL. Custom range validation rejects reversed ranges and applies a bounded maximum span.

## User Interface

The authenticated sidebar gains a separate Usage Reports entry.

The page contains:

1. A filter bar with time preset/custom range, bucket granularity, provider, model, billing source, and an administrator-only user selector.
2. Summary cards for input, output, cache, and total tokens, wallet fees, subscription consumption, and combined user fees.
3. A trend visualization aligned to the selected daily/weekly/monthly granularity.
4. A paginated grouped table keyed by time bucket, user, provider, and model.

The administrator view includes user identity; the ordinary-user view hides the redundant user column. Supplier cost is displayed as unconfigured until the pricing source exists. Loading, empty, partial-sync, and error states are explicit. The page shows the most recent confirmed ledger time and pending compensation count so operators can judge freshness.

All user-facing strings use the existing i18n system. The page follows existing React Query, TanStack Router, table, chart, accessibility, and responsive-layout conventions.

## Failure Handling and Observability

Only confirmed ledger rows contribute to reports. Pending events remain excluded until compensation succeeds.

Ledger recording and compensation expose structured logs and counters for insertion failures, duplicate idempotency hits, retry attempts, permanently failed events, pending count, and last confirmed event time. Repeated retries are safe because the idempotency key is unique.

If compensation is pending, the API still returns confirmed data together with freshness metadata rather than silently presenting it as complete. Invalid filters produce a clear validation response; query failures use the project's standard API error handling.

## Testing and Verification

Backend tests protect the accounting and authorization contracts:

- successful wallet charge;
- successful subscription consumption;
- positive adjustment and refund netting;
- failed settlement producing no confirmed report row;
- duplicate event idempotency;
- compensation retry behavior;
- administrator versus ordinary-user data isolation;
- provider/model grouping and daily, Monday-based weekly, monthly, and timezone boundaries;
- token totals not being duplicated by adjustments/refunds;
- database-portable report behavior.

Frontend tests or focused component verification cover filter-to-query behavior, summary/trend/table consistency, pagination, administrator-only controls, ordinary-user scoping, unconfigured supplier cost, and loading/error/freshness states.

Verification includes relevant Go tests, frontend type checking, linting of changed files, and a production frontend build.

## Out of Scope

- Backfilling records from existing usage logs.
- Reading or managing the supplier-price Excel workbook.
- Calculating supplier cost in the first release.
- Replacing or modifying the existing usage-log feature.
- Exporting the report to Excel or other file formats.

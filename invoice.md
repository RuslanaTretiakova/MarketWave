# Monthly Aggregated Invoice System — Claude Implementation Prompt

Implement a fully automated monthly aggregated invoice system for the existing Supabase/Postgres architecture described below.

IMPORTANT:

- Follow the existing DB architecture, RLS model, trigger patterns, status workflows, naming conventions, and Server Action structure already used in the project.
- DO NOT introduce parallel invoice systems.
- Extend the existing `invoices` + `invoice_items` architecture.
- Preserve compatibility with current order lifecycle, notifications, and audit behavior.
- Use ALTER migrations only. Never modify old migrations.
- Use Postgres-first architecture: constraints, triggers, indexes, and RLS enforcement at DB layer whenever possible.
- Server Actions enforce permissions and orchestration.
- Reuse existing patterns from:
  - orders
  - notifications
  - content workflow
  - status transition triggers

---

# TARGET BUSINESS LOGIC

The current system creates 1 invoice per order automatically.

This must be replaced with:

- ONE monthly invoice per client
- invoice contains MULTIPLE published orders
- invoices generated automatically once per month
- admin/manager can manually adjust invoice contents before sending
- invoice status lifecycle:
  - draft
  - sent
  - paid

When invoice becomes paid:

- all attached orders become `completed`

Only orders with:

```sql
status = 'published'
```

can be included in invoices.

An order can belong to only ONE invoice item.

---

# REQUIRED ARCHITECTURE CHANGES

# 1. DATABASE CHANGES

Create a new migration.

## 1.1 Remove old assumptions

Current schema assumes:

- invoice may be created on order insert
- invoices.order_id exists

This must change.

Invoices become:

- monthly grouped billing containers
- not directly tied to one order

---

# 1.2 invoices table changes

ALTER `public.invoices`

REMOVE direct order dependency.

Requirements:

- `order_id` becomes nullable or removed entirely
- `invoice_group_id` no longer needed
- add:
  - `client_id UUID NOT NULL FK -> profiles(id)`
  - `billing_month DATE NOT NULL`
  - `generated_at TIMESTAMPTZ`
  - `sent_by UUID NULL FK -> profiles(id)`
  - `paid_by UUID NULL FK -> profiles(id)`
  - `notes TEXT`
  - `subtotal NUMERIC(10,2)`
  - `adjustments NUMERIC(10,2) DEFAULT 0`
  - `total NUMERIC(10,2)`

Invoice identity becomes:

```sql
UNIQUE(client_id, billing_month)
WHERE status = 'draft'
```

Only one draft invoice per client per month.

Keep:

- status
- due_date
- invoice_number
- sent_at
- paid_at
- created_at
- updated_at

---

# 1.3 invoice_items redesign

Invoice items become the source of truth.

Each item references one order.

Required columns:

```sql
invoice_id UUID NOT NULL
order_id UUID NOT NULL UNIQUE
description TEXT
amount NUMERIC(10,2) NOT NULL
created_at TIMESTAMPTZ
```

Constraints:

- one order can appear only once across all invoice items
- only published/completed orders may be attached

---

# 1.4 Invoice total sync trigger

Create trigger:

```sql
sync_invoice_totals_from_items()
```

Behavior:

- subtotal = SUM(invoice_items.amount)
- total = subtotal + adjustments

Runs on:

- INSERT invoice_items
- UPDATE invoice_items
- DELETE invoice_items
- UPDATE invoices.adjustments

---

# 1.5 Prevent editing sent/paid invoices

Create DB trigger:

```sql
enforce_invoice_mutability()
```

Rules:

DRAFT:

- editable

SENT:

- invoice_items immutable
- totals immutable
- adjustments immutable

PAID:

- fully immutable

Reject with:

```sql
RAISE EXCEPTION USING ERRCODE = 'P0001'
```

---

# 1.6 Mark invoice paid trigger

Create trigger:

```sql
handle_invoice_paid()
```

When:

```sql
status changes to 'paid'
```

Then:

- set `paid_at`
- update all attached orders:

```sql
status = 'completed'
completed_at = now()
```

Only for orders currently:

```sql
status = 'published'
```

---

# 1.7 Automatic monthly invoice generation function

Create Postgres function:

```sql
generate_monthly_invoices(p_billing_month DATE)
```

Behavior:

For every client:

- find all orders:

```sql
status = 'published'
```

AND:

- not already invoiced
- publish_date inside billing month

Create:

- one invoice per client
- status = 'draft'

Then:

- create invoice_items for every eligible order

Invoice values:

```sql
subtotal = SUM(order.price)
total = subtotal
adjustments = 0
```

Must be:

- idempotent
- safe to rerun
- skip clients without eligible orders

---

# 1.8 pg_cron automation

Add monthly cron job.

Schedule:

- first day of month
- 02:00 UTC

Job:

```sql
SELECT generate_monthly_invoices(date_trunc('month', now() - interval '1 month'));
```

This generates invoices for PREVIOUS month.

Example:

- August 1 generates July invoices.

---

# 2. RLS REQUIREMENTS

Implement policies exactly.

# invoices

## SELECT

Client:

- only own invoices
- only:
  - sent
  - paid

Manager/Admin:

- all

System/service role:

- full

---

## UPDATE

Manager/Admin:

- only draft invoices editable
- sent -> paid allowed

Client:

- none

---

## INSERT

Only:

- service role
- cron generation function

---

# invoice_items

## SELECT

Client:

- only through own invoice
- only sent/paid

Manager/Admin:

- all

---

## INSERT/DELETE/UPDATE

Only:

- manager/admin
- only when invoice.status='draft'

---

# 3. SERVER ACTIONS

Implement actions using existing project patterns.

Use:

- getSessionContext()
- adminClient
- role gates
- revalidatePath()

---

# 3.1 loadInvoices()

Features:

- pagination
- filtering
- role-aware visibility

Filters:

- status
- client
- billing month
- invoice number

Sorting:

```sql
created_at DESC
```

---

# 3.2 loadInvoiceById()

Returns:

- invoice
- invoice_items
- client profile
- attached orders

---

# 3.3 editInvoiceOrders()

Allows:

- add order
- remove order

Only:

- admin/manager
- draft invoices

Validation:

- order must belong to invoice client
- order must be published
- order not already invoiced

---

# 3.4 sendInvoice()

Behavior:

- draft -> sent
- set sent_at
- set sent_by

Generate:

- invoice_number if missing

Send notification:

```ts
notifyOrderEvent('invoice_sent')
```

Recipients:

- client
- managers

---

# 3.5 markInvoicePaid()

Behavior:

- sent -> paid
- trigger completes orders

Set:

- paid_by
- paid_at

Emit:

```ts
notifyOrderEvent('invoice_paid')
```

---

# 3.6 downloadInvoicePdf()

Generate PDF invoice.

Include:

- company branding
- invoice number
- client info
- billing month
- invoice items table
- subtotal
- adjustments
- total
- due date

---

# 4. UI REQUIREMENTS

Implement screens.

---

# 4.1 All Invoices Screen

Columns:

- invoice number
- client
- billing month
- orders count
- subtotal
- adjustments
- total
- status
- sent_at
- paid_at
- created_at

Filters:

- status
- month
- client

Actions:

- View
- Edit
- Send
- Mark Paid
- Download

Permissions:

CLIENT:

- view only own sent/paid
- download own sent/paid

MANAGER:

- all except create manual invoice

ADMIN:

- full

SYSTEM:

- automatic generation only

---

# 4.2 View Invoice Screen

Display:

- invoice metadata
- invoice items
- order links
- totals
- timeline
- statuses

---

# 4.3 Edit Invoice Orders Screen

Only for draft invoices.

Features:

- add published uninvoiced orders
- remove invoice items
- edit adjustments
- live total recalculation

---

# 5. USE CASES TO IMPLEMENT

# View Invoices

- display invoice list

# View Invoice

- display invoice details

# Filter Invoices

- filter invoice list

# Create Invoices

- automatic monthly generation

# Edit Invoice Orders

- modify draft invoice composition

# Send Invoice

- draft -> sent

# Mark Invoice as paid

- sent -> paid
- complete all attached orders

# Download PDF

- export invoice PDF

---

# 6. IMPORTANT BUSINESS RULES

# Orders

Only:

```sql
published
```

orders are invoiceable.

When invoice paid:

```sql
published -> completed
```

---

# Invoice Mutability

DRAFT:

- fully editable

SENT:

- frozen

PAID:

- frozen forever

---

# Aggregation

One invoice:

```text
1 client
1 billing month
many orders
```

---

# Safety

Must prevent:

- duplicate invoicing
- cross-client order attachment
- editing sent invoices
- deleting paid invoices
- attaching completed orders to draft invoices

---

# 7. PERFORMANCE REQUIREMENTS

Add indexes:

```sql
orders(user_id, status, publish_date)
invoice_items(order_id)
invoices(client_id, billing_month)
invoices(status, billing_month)
```

Use batch queries.
Avoid N+1 profile loading.

---

# 8. MIGRATION SAFETY

Migration must:

- preserve existing invoices
- migrate old single-order invoices into grouped structure safely
- backfill invoice_items from invoices.order_id
- not lose invoice history

---

# 9. FILES TO MODIFY

Expected areas:

- supabase/migrations/\*
- lib/invoices/\*
- lib/orders/\*
- lib/notifications/\*
- app/(app)/invoices/\*
- components/invoices/\*
- database.types.new.ts

---

# 10. CODING STYLE

Follow existing project conventions exactly:

- Supabase Server Actions
- RLS-first security
- trigger-based integrity
- no client-side trust
- strong TypeScript typing
- revalidatePath after mutations
- adminClient only in server code

Do not introduce Prisma or ORM abstractions.

Use existing notification architecture.

Use existing audit/history patterns where appropriate.

# Client role

The **Client** is an external user who purchases website placements and manages approval through the order lifecycle.

## Core responsibilities

- Select websites for placement
- Create placement orders
- Review submitted content
- Approve content or request revisions
- Receive invoices
- Complete payment

The client workflow starts at catalog/cart selection and ends after invoice payment.

## Permissions and capabilities

### Sites and ordering

- View all active websites available for placement
- Filter websites with search and available filters
- Add selected websites to cart
- Create new orders from cart checkout
- View all orders they created
- Cancel or edit only when order status is `new`

### Content review

- Review submitted content when order status reaches `content_sent`
- Approve content (moves to `content_approved`)
- Request revisions with a change note (moves to `needs_changes`)

### Invoices

- View invoices related to their own orders
- Open individual invoice details
- Download invoice PDF

### Chats

- Participate in client-facing chat channels:
  - Support chat
  - Sales chat
  - Standard order chat

## Workflow state boundaries

Client actions are status-aware and restricted by server-side authorization and RLS policies.

- `new`: client can cancel their own order
- `content_sent`: client can approve or request changes
- Other statuses: client has read-only visibility for order progress

## Security and data access

- Clients can only access their own order and invoice data
- Clients cannot create orders via direct DB writes; order creation runs through secured Server Actions
- All data access is enforced at DB level via RLS, with server-side checks as defense in depth

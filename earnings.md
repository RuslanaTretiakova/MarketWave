1. Summary Cards

- Earnings (read only)
  - calculated as:
    SUM(order.price \* sourcer_percentage)
  - represents the profit portion received by the Sourcer
- Orders Count (read only)
  - total number of eligible orders

2. Filters

- Sourcer (User select)
  - optional
  - if user.role = Sourcer:
    - field hidden
    - value = current user
  - if user.role != Sourcer:
    - field visible
    - default value = empty

- Month (date range)
  - required
  - default = last month

3. Actions

- Prev Month button
  - switches filter to previous month
- Next Month button
  - switches filter to next month

4. Business Rules

- Include only eligible orders within selected date range
- Earnings must update dynamically when filters change
- Use pagination for orders table if implemented
- Add loading, empty, and error states

5. Tech Requirements

- React + Next.js frontend
- TypeScript
- NestJS backend
- PostgreSQL
- RBAC support
- Clean architecture
- REST API

6. Deliverables

- UI structure
- API endpoints
- DB/query logic
- earnings calculation logic
- validation rules
- example code snippets

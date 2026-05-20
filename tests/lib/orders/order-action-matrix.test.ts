import { describe, expect, it } from 'vitest'

import {
  getOrderActionAvailability,
  isOrderActionEnabled,
  type OrderActionContext,
} from '@/lib/orders/order-action-matrix'

const base: OrderActionContext = {
  role: 'client',
  status: 'new',
  userId: 'u1',
  orderUserId: 'u1',
  copywriterId: null,
  invoiceId: null,
  invoiceStatus: null,
}

function actions(ctx: Partial<OrderActionContext>) {
  return getOrderActionAvailability({ ...base, ...ctx })
}

function enabled(ctx: Partial<OrderActionContext>, id: Parameters<typeof isOrderActionEnabled>[1]) {
  return isOrderActionEnabled(actions(ctx), id)
}

describe('view_details', () => {
  it('is always enabled', () => {
    expect(enabled({}, 'view_details')).toBe(true)
    expect(enabled({ role: 'admin' }, 'view_details')).toBe(true)
    expect(enabled({ role: 'copywriter', userId: 'c1', copywriterId: 'c1' }, 'view_details')).toBe(
      true
    )
  })
})

describe('edit_order', () => {
  it('client can edit own new order', () => {
    expect(
      enabled({ role: 'client', status: 'new', userId: 'u1', orderUserId: 'u1' }, 'edit_order')
    ).toBe(true)
  })

  it('client cannot edit non-new order', () => {
    expect(enabled({ role: 'client', status: 'in_progress' }, 'edit_order')).toBe(false)
  })

  it("client cannot edit another user's order", () => {
    expect(enabled({ role: 'client', userId: 'u1', orderUserId: 'u2' }, 'edit_order')).toBe(false)
  })

  it('admin can always edit', () => {
    expect(enabled({ role: 'admin', status: 'published' }, 'edit_order')).toBe(true)
  })

  it('manager cannot edit', () => {
    expect(enabled({ role: 'manager' }, 'edit_order')).toBe(false)
  })
})

describe('start_order', () => {
  it('staff can start a new order', () => {
    expect(enabled({ role: 'admin', status: 'new' }, 'start_order')).toBe(true)
    expect(enabled({ role: 'manager', status: 'new' }, 'start_order')).toBe(true)
  })

  it('client cannot start an order', () => {
    expect(enabled({ role: 'client', status: 'new' }, 'start_order')).toBe(false)
  })

  it('staff cannot start a non-new order', () => {
    expect(enabled({ role: 'admin', status: 'in_progress' }, 'start_order')).toBe(false)
  })
})

describe('cancel_order', () => {
  it('client can cancel own new order', () => {
    expect(
      enabled({ role: 'client', status: 'new', userId: 'u1', orderUserId: 'u1' }, 'cancel_order')
    ).toBe(true)
  })

  it("client cannot cancel another user's order", () => {
    expect(
      enabled({ role: 'client', status: 'new', userId: 'u1', orderUserId: 'u2' }, 'cancel_order')
    ).toBe(false)
  })

  it('client cannot cancel non-new order', () => {
    expect(enabled({ role: 'client', status: 'in_progress' }, 'cancel_order')).toBe(false)
  })

  it('staff can cancel new order', () => {
    expect(enabled({ role: 'admin', status: 'new' }, 'cancel_order')).toBe(true)
    expect(enabled({ role: 'manager', status: 'new' }, 'cancel_order')).toBe(true)
  })
})

describe('assign_copywriter', () => {
  it('staff can assign on new/in_progress/content_sent/needs_changes', () => {
    const staffCtx = { role: 'admin' as const }
    expect(enabled({ ...staffCtx, status: 'new' }, 'assign_copywriter')).toBe(true)
    expect(enabled({ ...staffCtx, status: 'in_progress' }, 'assign_copywriter')).toBe(true)
    expect(enabled({ ...staffCtx, status: 'content_sent' }, 'assign_copywriter')).toBe(true)
    expect(enabled({ ...staffCtx, status: 'needs_changes' }, 'assign_copywriter')).toBe(true)
  })

  it('staff cannot assign on other statuses', () => {
    expect(enabled({ role: 'admin', status: 'published' }, 'assign_copywriter')).toBe(false)
  })

  it('client cannot assign', () => {
    expect(enabled({ role: 'client', status: 'new' }, 'assign_copywriter')).toBe(false)
  })
})

describe('submit_content', () => {
  const cw = { role: 'copywriter' as const, userId: 'cw1', copywriterId: 'cw1' }

  it('assigned copywriter can submit on in_progress or needs_changes', () => {
    expect(enabled({ ...cw, status: 'in_progress' }, 'submit_content')).toBe(true)
    expect(enabled({ ...cw, status: 'needs_changes' }, 'submit_content')).toBe(true)
  })

  it('unassigned copywriter cannot submit', () => {
    expect(enabled({ ...cw, copywriterId: 'other' }, 'submit_content')).toBe(false)
  })

  it('copywriter cannot submit on wrong status', () => {
    expect(enabled({ ...cw, status: 'new' }, 'submit_content')).toBe(false)
  })
})

describe('approve_content / request_changes', () => {
  it('client can approve or request changes on content_sent own order', () => {
    const ctx = {
      role: 'client' as const,
      status: 'content_sent' as const,
      userId: 'u1',
      orderUserId: 'u1',
    }
    expect(enabled(ctx, 'approve_content')).toBe(true)
    expect(enabled(ctx, 'request_changes')).toBe(true)
  })

  it('client cannot act on content_sent for another order', () => {
    const ctx = {
      role: 'client' as const,
      status: 'content_sent' as const,
      userId: 'u1',
      orderUserId: 'u2',
    }
    expect(enabled(ctx, 'approve_content')).toBe(false)
    expect(enabled(ctx, 'request_changes')).toBe(false)
  })
})

describe('invoice actions', () => {
  it('view_invoice requires invoiceId', () => {
    expect(enabled({ invoiceId: null }, 'view_invoice')).toBe(false)
    expect(enabled({ invoiceId: 'inv1' }, 'view_invoice')).toBe(true)
  })

  it('send_invoice requires staff + draft status', () => {
    expect(
      enabled({ role: 'admin', invoiceId: 'i1', invoiceStatus: 'draft' }, 'send_invoice')
    ).toBe(true)
    expect(
      enabled({ role: 'client', invoiceId: 'i1', invoiceStatus: 'draft' }, 'send_invoice')
    ).toBe(false)
    expect(enabled({ role: 'admin', invoiceId: 'i1', invoiceStatus: 'sent' }, 'send_invoice')).toBe(
      false
    )
  })

  it('mark_invoice_paid requires staff + sent status', () => {
    expect(
      enabled({ role: 'admin', invoiceId: 'i1', invoiceStatus: 'sent' }, 'mark_invoice_paid')
    ).toBe(true)
    expect(
      enabled({ role: 'client', invoiceId: 'i1', invoiceStatus: 'sent' }, 'mark_invoice_paid')
    ).toBe(false)
    expect(
      enabled({ role: 'admin', invoiceId: 'i1', invoiceStatus: 'draft' }, 'mark_invoice_paid')
    ).toBe(false)
  })
})

describe('admin-only actions', () => {
  it('override_status is admin-only', () => {
    expect(enabled({ role: 'admin' }, 'override_status')).toBe(true)
    expect(enabled({ role: 'manager' }, 'override_status')).toBe(false)
    expect(enabled({ role: 'client' }, 'override_status')).toBe(false)
  })

  it('delete_order is admin-only on new/canceled', () => {
    expect(enabled({ role: 'admin', status: 'new' }, 'delete_order')).toBe(true)
    expect(enabled({ role: 'admin', status: 'canceled' }, 'delete_order')).toBe(true)
    expect(enabled({ role: 'admin', status: 'in_progress' }, 'delete_order')).toBe(false)
    expect(enabled({ role: 'manager', status: 'new' }, 'delete_order')).toBe(false)
  })
})

describe('isOrderActionEnabled', () => {
  it('returns false for unknown action id', () => {
    const list = getOrderActionAvailability(base)
    expect(
      isOrderActionEnabled(list, 'nonexistent' as Parameters<typeof isOrderActionEnabled>[1])
    ).toBe(false)
  })
})

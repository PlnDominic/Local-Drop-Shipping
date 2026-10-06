import { supabase } from './client';

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketCategory = 'order' | 'delivery' | 'payment' | 'refund' | 'product' | 'account' | 'other';

export const TICKET_CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: 'order', label: 'Problem with an order' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'refund', label: 'Return or refund' },
  { id: 'payment', label: 'Payment or wallet' },
  { id: 'product', label: 'Product question' },
  { id: 'account', label: 'My account' },
  { id: 'other', label: 'Something else' },
];

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting: 'Waiting for you',
  resolved: 'Resolved',
  closed: 'Closed',
};

export interface Ticket {
  id: string;
  ticketNumber: string;
  createdBy: string;
  orderId: string | null;
  orderNumber: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  lastMessageAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorName: string;
  authorRole: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

interface TicketRow {
  id: string;
  ticket_number: string;
  created_by: string;
  order_id: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  created_at: string;
  last_message_at: string;
  orders?: { order_number: string | null } | null;
}

interface MessageRow {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  author_role: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

const TICKET_SELECT = 'id, ticket_number, created_by, order_id, category, subject, status, created_at, last_message_at, orders(order_number)';

const mapTicket = (r: TicketRow): Ticket => ({
  id: r.id,
  ticketNumber: r.ticket_number,
  createdBy: r.created_by,
  orderId: r.order_id,
  orderNumber: r.orders?.order_number ?? null,
  category: r.category,
  subject: r.subject,
  status: r.status,
  createdAt: r.created_at,
  lastMessageAt: r.last_message_at,
});

const mapMessage = (r: MessageRow): TicketMessage => ({
  id: r.id,
  ticketId: r.ticket_id,
  authorId: r.author_id,
  authorName: r.author_name,
  authorRole: r.author_role,
  body: r.body,
  isInternal: r.is_internal,
  createdAt: r.created_at,
});

/** Tickets the signed-in user may see (row-level security does the filtering). */
export async function listTickets(status?: TicketStatus | 'active'): Promise<Ticket[]> {
  let q = supabase.from('support_tickets').select(TICKET_SELECT).order('last_message_at', { ascending: false }).limit(200);
  if (status === 'active') q = q.in('status', ['open', 'in_progress', 'waiting']);
  else if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as TicketRow[]).map(mapTicket);
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const { data, error } = await supabase.from('support_tickets').select(TICKET_SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapTicket(data as unknown as TicketRow) : null;
}

export async function listMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('id, ticket_id, author_id, author_name, author_role, body, is_internal, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(mapMessage);
}

export async function createTicket(input: {
  category: TicketCategory;
  subject: string;
  body: string;
  orderId?: string | null;
}): Promise<Ticket> {
  const { data, error } = await supabase.rpc('create_ticket', {
    p_category: input.category,
    p_subject: input.subject,
    p_body: input.body,
    p_order_id: input.orderId || null,
  });
  if (error) throw error;
  const row = data as { id: string };
  const ticket = await getTicket(row.id);
  if (!ticket) throw new Error('Ticket created but could not be loaded.');
  return ticket;
}

export async function postMessage(ticketId: string, body: string, internal = false): Promise<void> {
  const { error } = await supabase.rpc('post_ticket_message', { p_ticket_id: ticketId, p_body: body, p_internal: internal });
  if (error) throw error;
}

export async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase.rpc('set_ticket_status', { p_ticket_id: ticketId, p_status: status });
  if (error) throw error;
}

/** Orders the user can attach to a ticket (their purchases, their store's orders, or their supplied orders). */
export async function listAttachableOrders(): Promise<{ id: string; orderNumber: string; createdAt: string }[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as { id: string; order_number: string | null; created_at: string }[]).map((o) => ({
    id: o.id,
    orderNumber: o.order_number ?? o.id.slice(0, 8).toUpperCase(),
    createdAt: o.created_at,
  }));
}

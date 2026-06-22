import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { MoMoProvider } from './providers/momo.provider';
import { PaystackProvider } from './providers/paystack.provider';

export type PaymentChannel = 'paystack' | 'momo';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly paystack: PaystackProvider,
    private readonly momo: MoMoProvider,
  ) {}

  async initiate(
    orderId: string,
    channel: PaymentChannel,
    userId: string,
    email?: string,
    phone?: string,
  ) {
    const order = await this.getOwnedOrder(orderId, userId);

    const reference = `lds-${orderId}-${Date.now()}`;

    if (channel === 'paystack') {
      if (!email) throw new BadRequestException('Email required for Paystack.');
      const amountKobo = Math.round(order.total * 100);
      const result = await this.paystack.initializePayment(email, amountKobo, reference);

      await this.supabase.db.from('payments').insert({
        order_id: orderId,
        channel,
        reference,
        amount: order.total,
        status: 'pending',
      });

      return { authorizationUrl: result.authorization_url, reference };
    }

    if (channel === 'momo') {
      if (!phone) throw new BadRequestException('Phone required for MoMo.');
      const referenceId = await this.momo.requestToPay(
        String(order.total),
        'GHS',
        reference,
        phone,
        `Payment for order ${orderId}`,
      );

      await this.supabase.db.from('payments').insert({
        order_id: orderId,
        channel,
        reference: referenceId,
        amount: order.total,
        status: 'pending',
      });

      return { referenceId };
    }

    throw new BadRequestException('Unsupported payment channel.');
  }

  /**
   * Verifies a payment with its provider and confirms the order on success.
   * When `userId` is supplied (interactive call), the caller must own the order;
   * the webhook path omits it because the request is already signature-verified.
   */
  async verify(reference: string, userId?: string) {
    const { data: payment } = await this.supabase.db
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();

    if (!payment) throw new NotFoundException('Payment record not found.');

    if (userId) await this.getOwnedOrder(payment.order_id as string, userId);

    let verified = false;

    if (payment.channel === 'paystack') {
      const result = await this.paystack.verifyPayment(reference);
      // Confirm both success AND that the amount paid matches the order total
      // (amounts are in pesewas/kobo, i.e. major unit × 100).
      const expected = Math.round(Number(payment.amount) * 100);
      verified = result.status === 'success' && Number(result.amount) === expected;
    } else if (payment.channel === 'momo') {
      const result = await this.momo.getPaymentStatus(reference);
      verified = result.status === 'SUCCESSFUL';
    }

    const newStatus = verified ? 'success' : 'failed';

    await this.supabase.db
      .from('payments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('reference', reference);

    if (verified) {
      await this.supabase.db
        .from('orders')
        .update({ status: 'confirmed', payment_reference: reference, updated_at: new Date().toISOString() })
        .eq('id', payment.order_id);
    }

    return { verified, status: newStatus };
  }

  async webhook(payload: Record<string, unknown>, rawBody?: Buffer, signature?: string) {
    // Only Paystack-signed payloads are trusted; everything else is rejected.
    if (!this.paystack.verifySignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid webhook signature.');
    }

    const event = payload['event'] as string | undefined;
    const data = payload['data'] as Record<string, unknown> | undefined;

    if (event === 'charge.success' && data) {
      const reference = data['reference'] as string;
      await this.verify(reference);
    }

    return { received: true };
  }

  async listForOrder(orderId: string, userId: string) {
    await this.getOwnedOrder(orderId, userId);
    const { data } = await this.supabase.db
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  /** Loads an order and asserts the requesting dropshipper owns it. */
  private async getOwnedOrder(orderId: string, userId: string) {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, total, dropshipper_id')
      .eq('id', orderId)
      .single();

    if (!order) throw new NotFoundException('Order not found.');
    if (order.dropshipper_id !== userId) {
      throw new ForbiddenException('You do not have access to this order.');
    }
    return order;
  }
}

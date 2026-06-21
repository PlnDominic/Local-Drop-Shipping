import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async initiate(orderId: string, channel: PaymentChannel, email?: string, phone?: string) {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, total, dropshipper_id')
      .eq('id', orderId)
      .single();

    if (!order) throw new NotFoundException('Order not found.');

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

  async verify(reference: string) {
    const { data: payment } = await this.supabase.db
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single();

    if (!payment) throw new NotFoundException('Payment record not found.');

    let verified = false;

    if (payment.channel === 'paystack') {
      const result = await this.paystack.verifyPayment(reference);
      verified = result.status === 'success';
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

  async webhook(payload: Record<string, unknown>) {
    const event = payload['event'] as string | undefined;
    const data = payload['data'] as Record<string, unknown> | undefined;

    if (event === 'charge.success' && data) {
      const reference = data['reference'] as string;
      await this.verify(reference);
    }

    return { received: true };
  }

  async listForOrder(orderId: string) {
    const { data } = await this.supabase.db
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }
}

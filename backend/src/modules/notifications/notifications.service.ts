import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { WhatsappChannel } from './channels/whatsapp.channel';

export type NotificationChannel = 'sms' | 'email' | 'whatsapp';

export interface SendNotificationDto {
  userId: string;
  channel: NotificationChannel;
  subject?: string;
  message: string;
  phone?: string;
  email?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sms: SmsChannel,
    private readonly emailChannel: EmailChannel,
    private readonly whatsapp: WhatsappChannel,
  ) {}

  async send(dto: SendNotificationDto) {
    const { userId, channel, message, subject, phone, email } = dto;

    await this.supabase.db.from('notifications').insert({
      user_id: userId,
      channel,
      subject: subject ?? null,
      message,
      status: 'sent',
    });

    if (channel === 'sms' && phone) {
      await this.sms.send(phone, message);
    } else if (channel === 'email' && email) {
      await this.emailChannel.send({ to: email, subject: subject ?? 'Notification', html: message });
    } else if (channel === 'whatsapp' && phone) {
      await this.whatsapp.sendText(phone, message);
    }

    return { sent: true };
  }

  async notifyOrderStatus(orderId: string, status: string) {
    const { data: order } = await this.supabase.db
      .from('orders')
      .select('id, customer_name, customer_phone, dropshipper_id')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const message = `Hi ${order.customer_name}, your order #${orderId.slice(0, 8).toUpperCase()} status is now: ${status.toUpperCase()}.`;

    if (order.customer_phone) {
      await this.sms.send(order.customer_phone, message);
    }
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const { data, count, error } = await this.supabase.db
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  }
}

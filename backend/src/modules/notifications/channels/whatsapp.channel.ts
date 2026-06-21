import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappChannel {
  private readonly logger = new Logger(WhatsappChannel.name);
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('app.whatsappToken') ?? '';
    this.phoneNumberId = this.config.get<string>('app.whatsappPhoneNumberId') ?? '';
  }

  async sendText(to: string, message: string): Promise<void> {
    try {
      await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: message },
          }),
        },
      );
    } catch (err) {
      this.logger.error(`WhatsApp failed to ${to}: ${String(err)}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('app.hubtelClientId') ?? '';
    this.clientSecret = this.config.get<string>('app.hubtelClientSecret') ?? '';
  }

  async send(to: string, message: string): Promise<void> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      await fetch('https://smsc.hubtel.com/v1/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: 'LocalDrop',
          To: to,
          Content: message,
        }),
      });
    } catch (err) {
      this.logger.error(`SMS failed to ${to}: ${String(err)}`);
    }
  }
}

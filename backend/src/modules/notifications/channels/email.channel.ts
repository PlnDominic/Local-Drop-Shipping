import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private readonly apiKey: string;
  private readonly fromEmail = 'noreply@localdropshipping.gh.com';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('app.sendgridApiKey') ?? '';
  }

  async send(payload: EmailPayload): Promise<void> {
    try {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: this.fromEmail, name: 'Local Drop Shipping' },
          subject: payload.subject,
          content: [{ type: 'text/html', value: payload.html }],
        }),
      });
    } catch (err) {
      this.logger.error(`Email failed to ${payload.to}: ${String(err)}`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string;
  channel: string;
  customer: { email: string };
}

@Injectable()
export class PaystackProvider {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly config: ConfigService) {
    this.secretKey = this.config.getOrThrow<string>('app.paystackSecretKey');
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(
    email: string,
    amountKobo: number,
    reference: string,
  ): Promise<PaystackInitResponse> {
    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, amount: amountKobo, reference }),
    });
    const json = (await res.json()) as { data: PaystackInitResponse };
    return json.data;
  }

  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: this.headers(),
    });
    const json = (await res.json()) as { data: PaystackVerifyResponse };
    return json.data;
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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

  /**
   * Verifies a Paystack webhook signature: HMAC-SHA512 of the raw request body
   * keyed with the secret key, compared in constant time against the header.
   */
  verifySignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    if (!rawBody || !signature) return false;
    const expected = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }
}

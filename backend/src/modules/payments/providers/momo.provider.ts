import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MoMoPaymentResponse {
  referenceId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
}

@Injectable()
export class MoMoProvider {
  private readonly subscriptionKey: string;
  private readonly baseUrl = 'https://sandbox.momodeveloper.mtn.com';

  constructor(private readonly config: ConfigService) {
    this.subscriptionKey = this.config.get<string>('app.momoSubscriptionKey') ?? '';
  }

  async requestToPay(
    amount: string,
    currency: string,
    externalId: string,
    phone: string,
    payerMessage: string,
  ): Promise<string> {
    const referenceId = crypto.randomUUID();
    await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'X-Reference-Id': referenceId,
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        externalId,
        payer: { partyIdType: 'MSISDN', partyId: phone },
        payerMessage,
        payeeNote: payerMessage,
      }),
    });
    return referenceId;
  }

  async getPaymentStatus(referenceId: string): Promise<MoMoPaymentResponse> {
    const res = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      headers: {
        'X-Target-Environment': 'sandbox',
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      },
    });
    const json = (await res.json()) as { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED' };
    return { referenceId, status: json.status };
  }
}

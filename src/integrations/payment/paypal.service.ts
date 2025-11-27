/**
 * PayPal Payment Integration Service
 * DESE EA PLAN v7.0
 */

import { config } from '@/config';
import { logger } from '@/utils/logger';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
}

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

interface PayPalCapture {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
}

export class PayPalService {
  private config: PayPalConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      clientId: config.paypal?.clientId || process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: config.paypal?.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '',
      mode: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
    };
    
    this.baseUrl = this.config.mode === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`PayPal auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
    
    return this.accessToken;
  }

  /**
   * Create a PayPal order
   */
  async createOrder(params: {
    amount: number;
    currency: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<PayPalOrder> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
          description: params.description,
          custom_id: params.metadata?.subscriptionId,
        }],
        application_context: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          brand_name: 'DESE EA Plan',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('PayPal create order failed', { error });
      throw new Error(`PayPal order creation failed: ${error.message}`);
    }

    const order = await response.json();
    logger.info('PayPal order created', { orderId: order.id });
    
    return order;
  }

  /**
   * Capture payment for an order
   */
  async captureOrder(orderId: string): Promise<PayPalCapture> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('PayPal capture failed', { orderId, error });
      throw new Error(`PayPal capture failed: ${error.message}`);
    }

    const capture = await response.json();
    logger.info('PayPal payment captured', { orderId, captureId: capture.id });
    
    return capture;
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<PayPalOrder> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PayPal get order failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refund a captured payment
   */
  async refund(captureId: string, amount?: number, currency?: string): Promise<unknown> {
    const token = await this.getAccessToken();

    const body: Record<string, unknown> = {};
    if (amount && currency) {
      body.amount = {
        value: amount.toFixed(2),
        currency_code: currency,
      };
    }

    const response = await fetch(`${this.baseUrl}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error('PayPal refund failed', { captureId, error });
      throw new Error(`PayPal refund failed: ${error.message}`);
    }

    const refund = await response.json();
    logger.info('PayPal refund processed', { captureId, refundId: refund.id });
    
    return refund;
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(params: {
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookId: string;
    webhookEvent: unknown;
  }): Promise<boolean> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: params.transmissionId,
        transmission_time: params.transmissionTime,
        cert_url: params.certUrl,
        auth_algo: params.authAlgo,
        transmission_sig: params.transmissionSig,
        webhook_id: params.webhookId,
        webhook_event: params.webhookEvent,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  }
}

export const paypalService = new PayPalService();


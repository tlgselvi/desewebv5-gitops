/**
 * iyzico Payment Integration Service
 * DESE EA PLAN v7.0
 * 
 * iyzico - Turkey's leading payment gateway
 */

import crypto from 'crypto';
import { config } from '@/config';
import { logger } from '@/utils/logger';

interface IyzicoConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

interface PaymentRequest {
  locale?: 'tr' | 'en';
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: 'TRY' | 'USD' | 'EUR';
  installment: number;
  paymentChannel: 'WEB' | 'MOBILE' | 'MOBILE_WEB';
  paymentGroup: 'PRODUCT' | 'LISTING' | 'SUBSCRIPTION';
  paymentCard: {
    cardHolderName: string;
    cardNumber: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    registerCard?: number;
  };
  buyer: {
    id: string;
    name: string;
    surname: string;
    gsmNumber?: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  };
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    category2?: string;
    itemType: 'PHYSICAL' | 'VIRTUAL';
    price: string;
  }>;
}

interface PaymentResponse {
  status: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
  locale: string;
  systemTime: number;
  conversationId: string;
  price: number;
  paidPrice: number;
  installment: number;
  paymentId: string;
  fraudStatus: number;
  merchantCommissionRate: number;
  merchantCommissionRateAmount: number;
  iyziCommissionRateAmount: number;
  iyziCommissionFee: number;
  cardType: string;
  cardAssociation: string;
  cardFamily: string;
  binNumber: string;
  lastFourDigits: string;
  currency: string;
  itemTransactions: Array<{
    itemId: string;
    paymentTransactionId: string;
    transactionStatus: number;
    price: number;
    paidPrice: number;
  }>;
}

export class IyzicoService {
  private config: IyzicoConfig;

  constructor() {
    this.config = {
      apiKey: config.iyzico?.apiKey || process.env.IYZICO_API_KEY || '',
      secretKey: config.iyzico?.secretKey || process.env.IYZICO_SECRET_KEY || '',
      baseUrl: process.env.IYZICO_MODE === 'live'
        ? 'https://api.iyzipay.com'
        : 'https://sandbox-api.iyzipay.com',
    };
  }

  /**
   * Generate authorization header
   */
  private generateAuthHeader(request: Record<string, unknown>): string {
    const randomString = this.generateRandomString();
    const pkiString = this.generatePkiString(request);
    const hashData = this.config.apiKey + randomString + this.config.secretKey + pkiString;
    const signature = this.generateHash(hashData);
    
    return `IYZWS ${this.config.apiKey}:${signature}`;
  }

  private generateRandomString(length = 20): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  private generateHash(data: string): string {
    return crypto.createHash('sha1').update(data, 'utf8').digest('base64');
  }

  private generatePkiString(obj: Record<string, unknown>, prefix = ''): string {
    let result = '[';
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value)) {
        result += `${key}=[`;
        for (const item of value) {
          if (typeof item === 'object') {
            result += this.generatePkiString(item as Record<string, unknown>);
          } else {
            result += `${item},`;
          }
        }
        result = result.replace(/,$/, '') + '],';
      } else if (typeof value === 'object') {
        result += `${key}=${this.generatePkiString(value as Record<string, unknown>)},`;
      } else {
        result += `${key}=${value},`;
      }
    }
    
    result = result.replace(/,$/, '') + ']';
    return result;
  }

  /**
   * Make API request
   */
  private async request<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.generateAuthHeader(data),
        'x-iyzi-rnd': this.generateRandomString(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`iyzico request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Process payment
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    logger.info('Processing iyzico payment', { conversationId: request.conversationId });

    const response = await this.request<PaymentResponse>('/payment/auth', {
      locale: request.locale || 'tr',
      conversationId: request.conversationId,
      price: request.price,
      paidPrice: request.paidPrice,
      currency: request.currency,
      installment: request.installment,
      paymentChannel: request.paymentChannel,
      paymentGroup: request.paymentGroup,
      paymentCard: request.paymentCard,
      buyer: request.buyer,
      shippingAddress: request.shippingAddress,
      billingAddress: request.billingAddress,
      basketItems: request.basketItems,
    });

    if (response.status === 'failure') {
      logger.error('iyzico payment failed', { 
        conversationId: request.conversationId,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });
      throw new Error(`iyzico payment failed: ${response.errorMessage}`);
    }

    logger.info('iyzico payment successful', { 
      conversationId: request.conversationId,
      paymentId: response.paymentId,
    });

    return response;
  }

  /**
   * Create 3D Secure payment form
   */
  async create3DSecurePayment(request: PaymentRequest & {
    callbackUrl: string;
  }): Promise<{ threeDSHtmlContent: string }> {
    const response = await this.request<{ 
      status: string;
      threeDSHtmlContent: string;
      errorMessage?: string;
    }>('/payment/3dsecure/initialize', {
      ...request,
      callbackUrl: request.callbackUrl,
    });

    if (response.status === 'failure') {
      throw new Error(`iyzico 3DS init failed: ${response.errorMessage}`);
    }

    return { threeDSHtmlContent: response.threeDSHtmlContent };
  }

  /**
   * Complete 3D Secure payment
   */
  async complete3DSecurePayment(conversationId: string, paymentId: string): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('/payment/3dsecure/auth', {
      locale: 'tr',
      conversationId,
      paymentId,
    });
  }

  /**
   * Refund payment
   */
  async refund(params: {
    conversationId: string;
    paymentTransactionId: string;
    price: string;
    currency: string;
    ip: string;
  }): Promise<{ status: string; paymentTransactionId: string }> {
    const response = await this.request<{
      status: string;
      paymentTransactionId: string;
      errorMessage?: string;
    }>('/payment/refund', {
      locale: 'tr',
      conversationId: params.conversationId,
      paymentTransactionId: params.paymentTransactionId,
      price: params.price,
      currency: params.currency,
      ip: params.ip,
    });

    if (response.status === 'failure') {
      throw new Error(`iyzico refund failed: ${response.errorMessage}`);
    }

    logger.info('iyzico refund processed', { 
      conversationId: params.conversationId,
      paymentTransactionId: response.paymentTransactionId,
    });

    return response;
  }

  /**
   * Cancel payment
   */
  async cancel(params: {
    conversationId: string;
    paymentId: string;
    ip: string;
  }): Promise<{ status: string; paymentId: string }> {
    const response = await this.request<{
      status: string;
      paymentId: string;
      errorMessage?: string;
    }>('/payment/cancel', {
      locale: 'tr',
      conversationId: params.conversationId,
      paymentId: params.paymentId,
      ip: params.ip,
    });

    if (response.status === 'failure') {
      throw new Error(`iyzico cancel failed: ${response.errorMessage}`);
    }

    return response;
  }

  /**
   * Get installment info for bin number
   */
  async getInstallmentInfo(binNumber: string, price: string): Promise<{
    installmentDetails: Array<{
      binNumber: string;
      price: number;
      cardType: string;
      cardAssociation: string;
      cardFamilyName: string;
      installmentPrices: Array<{
        installmentNumber: number;
        totalPrice: number;
        installmentPrice: number;
      }>;
    }>;
  }> {
    return this.request('/payment/iyzi-pos/installment', {
      locale: 'tr',
      conversationId: this.generateRandomString(),
      binNumber,
      price,
    });
  }

  /**
   * Retrieve payment details
   */
  async getPaymentDetails(paymentId: string, conversationId: string): Promise<PaymentResponse> {
    return this.request('/payment/detail', {
      locale: 'tr',
      conversationId,
      paymentId,
    });
  }
}

export const iyzicoService = new IyzicoService();


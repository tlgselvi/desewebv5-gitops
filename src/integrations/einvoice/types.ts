export interface EInvoiceUser {
  identifier: string; // VKN or TCKN
  alias: string; // Postbox alias (urn:mail:defaultpk)
  title: string; // Company Name
  type: 'private' | 'public';
  firstCreationTime: Date;
}

export interface EInvoiceDocument {
  uuid: string;
  issueDate: Date;
  id: string; // Invoice Number (GIB...)
  payableAmount: number;
  currency: string;
  profileId: 'TICARIFATURA' | 'TEMELFATURA';
  typeCode: 'SATIS' | 'IADE';
  status: 'draft' | 'signed' | 'queued' | 'processing' | 'sent' | 'approved' | 'rejected';
  envelopeId?: string;
}

export interface IEInvoiceProvider {
  name: string;
  checkUser(vkn: string): Promise<EInvoiceUser | null>;
  sendInvoice(invoice: any): Promise<EInvoiceDocument>; // 'invoice' will be UBL object in real impl
  getInvoiceStatus(uuid: string): Promise<string>;
}


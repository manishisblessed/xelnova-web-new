import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IFSCResponse {
  BANK: string;
  IFSC: string;
  BRANCH: string;
  ADDRESS: string;
  CITY: string;
  DISTRICT: string;
  STATE: string;
  CONTACT?: string;
  MICR?: string;
  UPI?: boolean;
  RTGS?: boolean;
  NEFT?: boolean;
  IMPS?: boolean;
  SWIFT?: string;
}

export interface BankVerificationResponse {
  status: 'Success' | 'Failure';
  'Account Number'?: string;
  'Ifsc Code'?: string;
  nameAtBank?: string;
  bankName?: string;
  utr?: string;
  city?: string;
  branch?: string;
  micr?: number;
  message: string;
}

export interface BankVerificationResult {
  verified: boolean;
  accountNumber: string;
  ifscCode: string;
  nameAtBank: string;
  bankName?: string;
  branch?: string;
  city?: string;
  micr?: number;
  utr?: string;
  message: string;
}

export interface GSTINResponse {
  gstin: string;
  tradeName: string;
  legalName: string;
  address: string;
  status: string;
  stateCode: string;
  taxpayerType: string;
  constitutionOfBusiness: string;
  dateOfRegistration: string;
  lastUpdated: string;
  valid: boolean;
}

export interface DigilockerCreateUrlResult {
  verificationId: string;
  referenceId: number;
  orderId: string;
  url: string;
  status: string;
  documentRequested: string[];
  redirectUrl: string;
  message: string;
}

export interface DigilockerAadhaarResult {
  referenceId: number;
  verificationId: string;
  status: string;
  name: string;
  uid: string;
  dob: string;
  gender: string;
  careOf: string;
  address: string;
  splitAddress: Record<string, string>;
  yearOfBirth: string;
  message: string;
}

export interface DigilockerPanResult {
  referenceId: number;
  verificationId: string;
  status: string;
  name: string;
  panNumber: string;
  dob: string;
  gender: string;
  message: string;
}

export interface PanVerificationResult {
  panNumber: string;
  type: string;
  registeredName: string;
  status: string;
  message: string;
}

export interface Pan360Result {
  panNumber: string;
  type: string;
  registeredName: string;
  gender: string;
  dob: string;
  maskedAadhaar: string;
  aadhaarLinked: boolean;
  status: string;
  message: string;
}

@Injectable()
export class VerificationService {
  private readonly GSTIN_API_KEY = process.env.GSTIN_API_KEY || '';
  private readonly GSTIN_API_URL = 'https://sheet.gstincheck.co.in/check';
  private readonly EKYCHUB_USERNAME = process.env.EKYCHUB_USERNAME || '';
  private readonly EKYCHUB_TOKEN = process.env.EKYCHUB_TOKEN || '';
  private readonly EKYCHUB_BASE_URL = 'https://connect.ekychub.in/v3';
  private readonly EKYCHUB_DIGILOCKER_REDIRECT_URL =
    process.env.EKYCHUB_DIGILOCKER_REDIRECT_URL || '';

  constructor(private prisma: PrismaService) {}

  async verifyIFSC(ifscCode: string, userId?: string): Promise<IFSCResponse> {
    const normalizedCode = ifscCode.toUpperCase().trim();
    
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedCode)) {
      await this.logVerification('IFSC', normalizedCode, 'INVALID_FORMAT', null, userId, 'Invalid IFSC format');
      throw new HttpException('Invalid IFSC code format', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await fetch(`https://ifsc.razorpay.com/${normalizedCode}`);
      
      if (!response.ok) {
        await this.logVerification('IFSC', normalizedCode, 'NOT_FOUND', null, userId, 'IFSC code not found');
        throw new HttpException('IFSC code not found', HttpStatus.NOT_FOUND);
      }

      const data: IFSCResponse = await response.json();
      
      await this.logVerification('IFSC', normalizedCode, 'VERIFIED', data, userId);

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      await this.logVerification('IFSC', normalizedCode, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'IFSC verification service is temporarily unavailable. Please try again later.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async verifyBankAccount(
    accountNumber: string,
    ifscCode: string,
    userId?: string,
  ): Promise<BankVerificationResult> {
    const normalizedIfsc = ifscCode.toUpperCase().trim();
    const normalizedAccount = accountNumber.trim();

    if (!/^[0-9]{9,18}$/.test(normalizedAccount)) {
      await this.logVerification('BANK_VERIFY', normalizedAccount, 'INVALID_FORMAT', null, userId, 'Invalid account number format');
      throw new HttpException('Invalid bank account number format', HttpStatus.BAD_REQUEST);
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc)) {
      await this.logVerification('BANK_VERIFY', normalizedAccount, 'INVALID_FORMAT', null, userId, 'Invalid IFSC format');
      throw new HttpException('Invalid IFSC code format', HttpStatus.BAD_REQUEST);
    }

    if (!this.EKYCHUB_USERNAME || !this.EKYCHUB_TOKEN) {
      await this.logVerification('BANK_VERIFY', normalizedAccount, 'CONFIG_ERROR', null, userId, 'eKYC Hub credentials not configured');
      throw new HttpException(
        { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const orderId = `XN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const url = new URL(`${this.EKYCHUB_BASE_URL}/verification/bank_verification`);
      url.searchParams.set('username', this.EKYCHUB_USERNAME);
      url.searchParams.set('token', this.EKYCHUB_TOKEN);
      url.searchParams.set('account_number', normalizedAccount);
      url.searchParams.set('ifsc', normalizedIfsc);
      url.searchParams.set('orderid', orderId);

      const response = await fetch(url.toString());

      if (!response.ok) {
        await this.logVerification('BANK_VERIFY', normalizedAccount, 'API_ERROR', null, userId, `API returned ${response.status}`);
        throw new HttpException(
          { success: false, message: 'Bank verification service is temporarily unavailable. Please try again later.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const data: BankVerificationResponse = await response.json();

      if (data.status === 'Success') {
        const result: BankVerificationResult = {
          verified: true,
          accountNumber: data['Account Number'] || normalizedAccount,
          ifscCode: data['Ifsc Code'] || normalizedIfsc,
          nameAtBank: data.nameAtBank || '',
          bankName: data.bankName,
          branch: data.branch,
          city: data.city,
          micr: data.micr,
          utr: data.utr,
          message: data.message,
        };

        await this.logVerification('BANK_VERIFY', normalizedAccount, 'VERIFIED', { ...result, orderId }, userId);
        return result;
      }

      await this.logVerification('BANK_VERIFY', normalizedAccount, 'FAILED', data, userId, data.message);
      throw new HttpException(
        data.message || 'Bank account verification failed',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;

      await this.logVerification('BANK_VERIFY', normalizedAccount, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'Bank verification failed. Please try again.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async verifyGSTIN(gstin: string, userId?: string): Promise<GSTINResponse> {
    const normalizedGstin = gstin.toUpperCase().trim();
    
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(normalizedGstin)) {
      await this.logVerification('GSTIN', normalizedGstin, 'INVALID_FORMAT', null, userId, 'Invalid GSTIN format');
      throw new HttpException('Invalid GSTIN format', HttpStatus.BAD_REQUEST);
    }

    if (!this.GSTIN_API_KEY) {
      await this.logVerification('GSTIN', normalizedGstin, 'CONFIG_ERROR', null, userId, 'GSTIN_API_KEY not configured');
      throw new HttpException(
        { success: false, message: 'GSTIN verification service is temporarily unavailable. Please try again later.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      const response = await fetch(`${this.GSTIN_API_URL}/${this.GSTIN_API_KEY}/${normalizedGstin}`);
      
      if (!response.ok) {
        await this.logVerification('GSTIN', normalizedGstin, 'API_ERROR', null, userId, `API returned ${response.status}`);
        throw new HttpException(
          { success: false, message: 'GSTIN verification service is temporarily unavailable. Please try again later.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const rawData = await response.json();
      
      if (!rawData.flag || rawData.flag === false) {
        const apiMsg = rawData.message || 'Invalid GSTIN';
        const isServiceIssue = /credit|expire|limit|quota|balance|unauthorized/i.test(apiMsg);
        const isSystemError = /system\s*error|try\s*after\s*sometime|internal\s*server/i.test(apiMsg);
        await this.logVerification('GSTIN', normalizedGstin, isServiceIssue || isSystemError ? 'SERVICE_ERROR' : 'INVALID', rawData, userId, apiMsg);

        if (isServiceIssue) {
          console.error(`[GSTIN] API service error: ${apiMsg} — renew credits at gstincheck.co.in`);
          throw new HttpException(
            { success: false, message: 'GSTIN verification service is temporarily unavailable. Please try again later.' },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        if (isSystemError) {
          console.error(`[GSTIN] External API system error: ${apiMsg}`);
          throw new HttpException(
            { success: false, message: 'GSTIN verification service is experiencing issues. Please try again in a few minutes.' },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        throw new HttpException(
          { success: false, message: apiMsg },
          HttpStatus.BAD_REQUEST,
        );
      }

      const data: GSTINResponse = {
        gstin: rawData.data?.gstin || normalizedGstin,
        tradeName: rawData.data?.tradeNam || rawData.data?.tradeName || '',
        legalName: rawData.data?.lgnm || rawData.data?.legalName || '',
        address: this.formatGSTAddress(rawData.data),
        status: rawData.data?.sts || rawData.data?.status || '',
        stateCode: rawData.data?.stcd || normalizedGstin.substring(0, 2),
        taxpayerType: rawData.data?.dty || rawData.data?.taxpayerType || '',
        constitutionOfBusiness: rawData.data?.ctb || '',
        dateOfRegistration: rawData.data?.rgdt || '',
        lastUpdated: rawData.data?.lstupdt || '',
        valid: true,
      };

      await this.logVerification('GSTIN', normalizedGstin, 'VERIFIED', data, userId);

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      await this.logVerification('GSTIN', normalizedGstin, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'GSTIN verification failed. Please try again.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private formatGSTAddress(data: any): string {
    if (!data) return '';
    
    const pradr = data.pradr || data.principalAddress || {};
    const addr = pradr.addr || pradr;
    
    const parts = [
      addr.bno || addr.buildingNumber,
      addr.flno || addr.floorNumber,
      addr.bnm || addr.buildingName,
      addr.st || addr.street,
      addr.loc || addr.locality,
      addr.city,
      addr.dst || addr.district,
      addr.stcd || addr.state,
      addr.pncd || addr.pincode,
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  async validatePAN(pan: string): Promise<{ valid: boolean; format: boolean }> {
    const normalizedPan = pan.toUpperCase().trim();
    const isValidFormat = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalizedPan);
    
    return {
      valid: isValidFormat,
      format: isValidFormat,
    };
  }

  // ========== eKYCHub helpers ==========

  private ensureEkychubConfigured() {
    if (!this.EKYCHUB_USERNAME || !this.EKYCHUB_TOKEN) {
      console.error('[eKYCHub] Missing EKYCHUB_USERNAME or EKYCHUB_TOKEN in environment');
      throw new HttpException(
        { success: false, message: 'KYC verification service is temporarily unavailable. Please try again later.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private generateOrderId(): string {
    return `XN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // ========== Digilocker Aadhaar ==========

  async createDigilockerAadhaarUrl(
    orderId: string,
    userId?: string,
  ): Promise<DigilockerCreateUrlResult> {
    this.ensureEkychubConfigured();

    if (!this.EKYCHUB_DIGILOCKER_REDIRECT_URL) {
      console.error('[Digilocker] EKYCHUB_DIGILOCKER_REDIRECT_URL not configured');
      throw new HttpException(
        { success: false, message: 'Aadhaar verification service is temporarily unavailable. Please try again later.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!this.EKYCHUB_DIGILOCKER_REDIRECT_URL.startsWith('https://')) {
      console.warn(`[Digilocker] EKYCHUB_DIGILOCKER_REDIRECT_URL must be HTTPS. Current value: "${this.EKYCHUB_DIGILOCKER_REDIRECT_URL}"`);
    }

    const effectiveOrderId = orderId || this.generateOrderId();

    try {
      const url = new URL(`${this.EKYCHUB_BASE_URL}/digilocker/create_url_aadhaar`);
      url.searchParams.set('username', this.EKYCHUB_USERNAME);
      url.searchParams.set('token', this.EKYCHUB_TOKEN);
      url.searchParams.set('redirect_url', this.EKYCHUB_DIGILOCKER_REDIRECT_URL);
      url.searchParams.set('orderid', effectiveOrderId);

      const res = await fetch(url.toString());
      const body = await res.json();

      if (body.status !== 'Success') {
        const rawMsg = body.message || 'Failed to create Digilocker Aadhaar URL';
        const errorCode = body.code || '';
        await this.logVerification('AADHAAR_DIGILOCKER_URL', effectiveOrderId, 'FAILED', body, userId, rawMsg);

        const isIpIssue = /white\s*list\s*ip/i.test(rawMsg);
        const isRedirectIssue = errorCode === 'redirect_url_value_invalid';
        let userMsg = rawMsg;
        let status = HttpStatus.BAD_REQUEST;

        if (isIpIssue) {
          userMsg = 'Aadhaar verification service is temporarily unavailable. Please try again in a few minutes.';
          status = HttpStatus.SERVICE_UNAVAILABLE;
        } else if (isRedirectIssue) {
          userMsg = 'Aadhaar verification is misconfigured. Please contact support.';
          console.error(`[Digilocker] redirect_url_value_invalid — check EKYCHUB_DIGILOCKER_REDIRECT_URL: "${this.EKYCHUB_DIGILOCKER_REDIRECT_URL}"`);
          status = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          { success: false, message: userMsg, code: errorCode, type: body.type },
          status,
        );
      }

      const result: DigilockerCreateUrlResult = {
        verificationId: body.verification_id,
        referenceId: body.reference_id,
        orderId: effectiveOrderId,
        url: body.url,
        status: body.status,
        documentRequested: body.document_requested,
        redirectUrl: body.redirect_url,
        message: body.message,
      };

      await this.logVerification('AADHAAR_DIGILOCKER_URL', effectiveOrderId, 'URL_CREATED', result, userId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      await this.logVerification('AADHAAR_DIGILOCKER_URL', effectiveOrderId, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'Failed to create Digilocker Aadhaar URL. Please try again.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ========== Digilocker PAN ==========

  async createDigilockerPanUrl(
    orderId: string,
    userId?: string,
  ): Promise<DigilockerCreateUrlResult> {
    this.ensureEkychubConfigured();

    if (!this.EKYCHUB_DIGILOCKER_REDIRECT_URL) {
      console.error('[Digilocker PAN] EKYCHUB_DIGILOCKER_REDIRECT_URL not configured');
      throw new HttpException(
        { success: false, message: 'PAN verification service is temporarily unavailable. Please try again later.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const effectiveOrderId = orderId || this.generateOrderId();

    try {
      const url = new URL(`${this.EKYCHUB_BASE_URL}/digilocker/create_url_pan`);
      url.searchParams.set('username', this.EKYCHUB_USERNAME);
      url.searchParams.set('token', this.EKYCHUB_TOKEN);
      url.searchParams.set('redirect_url', this.EKYCHUB_DIGILOCKER_REDIRECT_URL);
      url.searchParams.set('orderid', effectiveOrderId);

      const res = await fetch(url.toString());
      const body = await res.json();

      if (body.status !== 'Success') {
        const rawMsg = body.message || 'Failed to create Digilocker PAN URL';
        const errorCode = body.code || '';
        await this.logVerification('PAN_DIGILOCKER_URL', effectiveOrderId, 'FAILED', body, userId, rawMsg);

        const isRedirectIssue = errorCode === 'redirect_url_value_invalid';
        let userMsg = rawMsg;
        let status = HttpStatus.BAD_REQUEST;

        if (isRedirectIssue) {
          userMsg = 'PAN verification is misconfigured. Please contact support.';
          console.error(`[Digilocker] redirect_url_value_invalid — check EKYCHUB_DIGILOCKER_REDIRECT_URL: "${this.EKYCHUB_DIGILOCKER_REDIRECT_URL}"`);
          status = HttpStatus.SERVICE_UNAVAILABLE;
        }

        throw new HttpException(
          { success: false, message: userMsg, code: errorCode, type: body.type },
          status,
        );
      }

      const result: DigilockerCreateUrlResult = {
        verificationId: body.verification_id,
        referenceId: body.reference_id,
        orderId: effectiveOrderId,
        url: body.url,
        status: body.status,
        documentRequested: body.document_requested,
        redirectUrl: body.redirect_url,
        message: body.message,
      };

      await this.logVerification('PAN_DIGILOCKER_URL', effectiveOrderId, 'URL_CREATED', result, userId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      await this.logVerification('PAN_DIGILOCKER_URL', effectiveOrderId, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'Failed to create Digilocker PAN URL. Please try again.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ========== Digilocker Get Document ==========

  async getDigilockerDocument(
    verificationId: string,
    referenceId: string,
    orderId: string,
    documentType: 'AADHAAR' | 'PAN',
    userId?: string,
  ): Promise<DigilockerAadhaarResult | DigilockerPanResult> {
    this.ensureEkychubConfigured();

    if (!verificationId || !referenceId || !orderId) {
      throw new HttpException('verificationId, referenceId and orderId are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const url = new URL(`${this.EKYCHUB_BASE_URL}/digilocker/get_document`);
      url.searchParams.set('username', this.EKYCHUB_USERNAME);
      url.searchParams.set('token', this.EKYCHUB_TOKEN);
      url.searchParams.set('verification_id', verificationId);
      url.searchParams.set('reference_id', referenceId);
      url.searchParams.set('orderid', orderId);
      url.searchParams.set('document_type', documentType);

      const res = await fetch(url.toString());
      const body = await res.json();

      if (body.status !== 'Success') {
        const rawMsg = body.message || `Failed to get Digilocker ${documentType} document`;
        const errorCode = body.code || '';
        const logType = documentType === 'AADHAAR' ? 'AADHAAR_DIGILOCKER_DOC' : 'PAN_DIGILOCKER_DOC';
        await this.logVerification(logType, orderId, 'FAILED', body, userId, rawMsg);

        const isUserIncomplete = /not completed|pending|in.?progress/i.test(rawMsg);
        const userMsg = isUserIncomplete
          ? 'Digilocker verification was not completed. Please try again.'
          : rawMsg;

        throw new HttpException(
          { success: false, message: userMsg, code: errorCode, type: body.type },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (documentType === 'AADHAAR') {
        const result: DigilockerAadhaarResult = {
          referenceId: body.reference_id,
          verificationId: body.verification_id,
          status: body.status,
          name: body.name,
          uid: body.uid,
          dob: body.dob,
          gender: body.gender,
          careOf: body.care_of || '',
          address: body.address || '',
          splitAddress: body.split_address || {},
          yearOfBirth: body.year_of_birth,
          message: body.message,
        };

        await this.logVerification('AADHAAR_DIGILOCKER_DOC', orderId, 'VERIFIED', {
          name: result.name,
          uid: result.uid,
          dob: result.dob,
          gender: result.gender,
        }, userId);

        return result;
      }

      const result: DigilockerPanResult = {
        referenceId: body.reference_id,
        verificationId: body.verification_id,
        status: body.status,
        name: body.name,
        panNumber: body.pan_number || body.pan || '',
        dob: body.dob || '',
        gender: body.gender || '',
        message: body.message,
      };

      await this.logVerification('PAN_DIGILOCKER_DOC', orderId, 'VERIFIED', {
        name: result.name,
        panNumber: result.panNumber,
        dob: result.dob,
      }, userId);

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const logType = documentType === 'AADHAAR' ? 'AADHAAR_DIGILOCKER_DOC' : 'PAN_DIGILOCKER_DOC';
      await this.logVerification(logType, orderId, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: `Failed to fetch your ${documentType === 'AADHAAR' ? 'Aadhaar' : 'PAN'} document. Please try again.` },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ========== eKYCHub PAN Verification ==========

  async verifyPan(
    panNumber: string,
    userId?: string,
  ): Promise<PanVerificationResult> {
    const normalizedPan = panNumber.toUpperCase().trim();

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalizedPan)) {
      await this.logVerification('PAN_VERIFY', normalizedPan, 'INVALID_FORMAT', null, userId, 'Invalid PAN format');
      throw new HttpException('Invalid PAN format', HttpStatus.BAD_REQUEST);
    }

    this.ensureEkychubConfigured();

    const orderId = this.generateOrderId();

    try {
      const url = new URL(`${this.EKYCHUB_BASE_URL}/verification/pan_verification`);
      url.searchParams.set('username', this.EKYCHUB_USERNAME);
      url.searchParams.set('token', this.EKYCHUB_TOKEN);
      url.searchParams.set('pan', normalizedPan);
      url.searchParams.set('orderid', orderId);

      const res = await fetch(url.toString());
      const body = await res.json();

      if (body.status !== 'Success') {
        const msg = body.message || 'PAN verification failed';
        await this.logVerification('PAN_VERIFY', normalizedPan, 'FAILED', body, userId, msg);
        throw new HttpException(msg, HttpStatus.BAD_REQUEST);
      }

      const result: PanVerificationResult = {
        panNumber: body.pan || normalizedPan,
        type: body.type || '',
        registeredName: body.registered_name || '',
        status: body.status,
        message: body.message,
      };

      await this.logVerification('PAN_VERIFY', normalizedPan, 'VERIFIED', result, userId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      await this.logVerification('PAN_VERIFY', normalizedPan, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'PAN verification failed. Please try again.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ========== eKYCHub PAN 360 ==========

  async verifyPan360(
    panNumber: string,
    userId?: string,
  ): Promise<Pan360Result> {
    const normalizedPan = panNumber.toUpperCase().trim();

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(normalizedPan)) {
      await this.logVerification('PAN_360', normalizedPan, 'INVALID_FORMAT', null, userId, 'Invalid PAN format');
      throw new HttpException('Invalid PAN format', HttpStatus.BAD_REQUEST);
    }

    this.ensureEkychubConfigured();

    const orderId = this.generateOrderId();

    try {
      const url = new URL(`${this.EKYCHUB_BASE_URL}/verification/pan_360`);
      url.searchParams.set('username', this.EKYCHUB_USERNAME);
      url.searchParams.set('token', this.EKYCHUB_TOKEN);
      url.searchParams.set('pan', normalizedPan);
      url.searchParams.set('orderid', orderId);

      const res = await fetch(url.toString());
      const body = await res.json();

      if (body.status !== 'Success') {
        const msg = body.message || 'PAN 360 verification failed';
        await this.logVerification('PAN_360', normalizedPan, 'FAILED', body, userId, msg);
        throw new HttpException(msg, HttpStatus.BAD_REQUEST);
      }

      const result: Pan360Result = {
        panNumber: body.pan || normalizedPan,
        type: body.type || '',
        registeredName: body.registered_name || '',
        gender: body.gender || '',
        dob: body.date_of_birth || '',
        maskedAadhaar: body.masked_aadhaar_number || '',
        aadhaarLinked: body.aadhaar_linked ?? false,
        status: body.status,
        message: body.message,
      };

      await this.logVerification('PAN_360', normalizedPan, 'VERIFIED', result, userId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      await this.logVerification('PAN_360', normalizedPan, 'ERROR', null, userId, error.message);
      throw new HttpException(
        { success: false, message: 'PAN verification failed. Please try again.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async updateSellerBankVerification(
    sellerId: string,
    accountNumber: string,
    ifscCode: string,
    userId?: string,
  ) {
    const bankData = await this.verifyBankAccount(accountNumber, ifscCode, userId);

    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        bankVerified: true,
        bankVerifiedAt: new Date(),
        bankVerifiedData: bankData as any,
        bankVerifiedName: bankData.nameAtBank,
        bankName: bankData.bankName || '',
        bankBranch: bankData.branch || '',
      },
    });

    return bankData;
  }

  async updateSellerGSTVerification(sellerId: string, gstin: string, userId?: string) {
    const gstData = await this.verifyGSTIN(gstin, userId);
    
    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        gstVerified: true,
        gstVerifiedAt: new Date(),
        gstVerifiedData: gstData as any,
      },
    });

    return gstData;
  }

  private async logVerification(
    type: string,
    identifier: string,
    status: string,
    response: any,
    userId?: string,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.verificationLog.create({
        data: {
          type,
          identifier,
          status,
          response: response || undefined,
          userId: userId || undefined,
          verifiedData: status === 'VERIFIED' ? response : undefined,
          errorMessage: errorMessage || undefined,
        },
      });
    } catch (error) {
      console.error('Failed to log verification:', error);
    }
  }

  async getVerificationLogs(filters: {
    type?: string;
    status?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { type, status, userId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.verificationLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.verificationLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ========== Customer Wallet KYC ==========

  async createCustomerKycUrl(userId: string): Promise<DigilockerCreateUrlResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, aadhaarVerified: true },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.aadhaarVerified) {
      throw new HttpException('KYC verification is already completed', HttpStatus.BAD_REQUEST);
    }

    const orderId = `WALLET_KYC_${userId}_${Date.now()}`;
    return this.createDigilockerAadhaarUrl(orderId, userId);
  }

  async verifyCustomerKyc(
    userId: string,
    verificationId: string,
    referenceId: string,
    orderId: string,
  ): Promise<{ verified: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, aadhaarVerified: true },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.aadhaarVerified) {
      return { verified: true, message: 'KYC verification is already completed' };
    }

    const aadhaarData = await this.getDigilockerDocument(
      verificationId,
      referenceId,
      orderId,
      'AADHAAR',
      userId,
    ) as DigilockerAadhaarResult;

    if (aadhaarData.status !== 'Success' || !aadhaarData.uid) {
      throw new HttpException('Aadhaar verification failed. Please try again.', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        aadhaarVerified: true,
        aadhaarVerifiedAt: new Date(),
        aadhaarVerifiedData: {
          name: aadhaarData.name,
          uid: aadhaarData.uid,
          dob: aadhaarData.dob,
          gender: aadhaarData.gender,
          verifiedAt: new Date().toISOString(),
          orderId,
          verificationId,
        },
      },
    });

    await this.logVerification('CUSTOMER_KYC', orderId, 'VERIFIED', {
      userId,
      name: aadhaarData.name,
      uid: aadhaarData.uid,
    }, userId);

    return { verified: true, message: 'KYC verification completed successfully' };
  }
}

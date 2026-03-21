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

@Injectable()
export class VerificationService {
  private readonly GSTIN_API_KEY = process.env.GSTIN_API_KEY || '8a8e34cd78c26d2d0a59cc9a51746065';
  private readonly GSTIN_API_URL = 'https://sheet.gstincheck.co.in/check';

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
      throw new HttpException('Failed to verify IFSC code', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async verifyGSTIN(gstin: string, userId?: string): Promise<GSTINResponse> {
    const normalizedGstin = gstin.toUpperCase().trim();
    
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(normalizedGstin)) {
      await this.logVerification('GSTIN', normalizedGstin, 'INVALID_FORMAT', null, userId, 'Invalid GSTIN format');
      throw new HttpException('Invalid GSTIN format', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await fetch(`${this.GSTIN_API_URL}/${this.GSTIN_API_KEY}/${normalizedGstin}`);
      
      if (!response.ok) {
        await this.logVerification('GSTIN', normalizedGstin, 'API_ERROR', null, userId, `API returned ${response.status}`);
        throw new HttpException('Failed to verify GSTIN', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const rawData = await response.json();
      
      if (!rawData.flag || rawData.flag === false) {
        await this.logVerification('GSTIN', normalizedGstin, 'INVALID', rawData, userId, rawData.message || 'Invalid GSTIN');
        throw new HttpException(rawData.message || 'Invalid GSTIN', HttpStatus.BAD_REQUEST);
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
      throw new HttpException('Failed to verify GSTIN', HttpStatus.SERVICE_UNAVAILABLE);
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

  async updateSellerBankVerification(sellerId: string, ifscCode: string, userId?: string) {
    const bankData = await this.verifyIFSC(ifscCode, userId);
    
    await this.prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        bankVerified: true,
        bankVerifiedAt: new Date(),
        bankVerifiedData: bankData as any,
        bankName: bankData.BANK,
        bankBranch: bankData.BRANCH,
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
}

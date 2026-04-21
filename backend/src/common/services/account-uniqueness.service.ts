import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Central service for validating account uniqueness constraints.
 * Handles both cross-role checks (email/phone across CUSTOMER, SELLER, etc.)
 * and seller-specific KYC field uniqueness (GST, bank account, PAN, Aadhaar).
 */
@Injectable()
export class AccountUniquenessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if an email is available for a NEW account registration.
   * This enforces cross-role uniqueness: an email used by any role cannot
   * be used to create a new account in any other role.
   *
   * Existing accounts (created before this policy) are grandfathered in
   * via the excludeUserId parameter.
   */
  async isEmailAvailableForNewAccount(
    email: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, role: true },
    });
    return !existing;
  }

  /**
   * Check if a phone number is available for a NEW account registration.
   * Enforces cross-role uniqueness similar to email.
   */
  async isPhoneAvailableForNewAccount(
    phone: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    const phoneVariants = this.getPhoneVariants(phone);
    const existing = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, role: true },
    });
    return !existing;
  }

  /**
   * Throws ConflictException if email is already in use by another account.
   */
  async assertEmailAvailable(
    email: string,
    excludeUserId?: string,
  ): Promise<void> {
    const available = await this.isEmailAvailableForNewAccount(email, excludeUserId);
    if (!available) {
      const existing = await this.prisma.user.findFirst({
        where: { email: email.trim().toLowerCase() },
        select: { role: true },
      });
      throw new ConflictException(
        `This email is already registered as a ${existing?.role?.toLowerCase() || 'user'} on Xelnova. Each email can only be used for one account.`,
      );
    }
  }

  /**
   * Throws ConflictException if phone is already in use by another account.
   */
  async assertPhoneAvailable(
    phone: string,
    excludeUserId?: string,
  ): Promise<void> {
    const available = await this.isPhoneAvailableForNewAccount(phone, excludeUserId);
    if (!available) {
      const phoneVariants = this.getPhoneVariants(phone);
      const existing = await this.prisma.user.findFirst({
        where: { phone: { in: phoneVariants } },
        select: { role: true },
      });
      throw new ConflictException(
        `This phone number is already registered as a ${existing?.role?.toLowerCase() || 'user'} on Xelnova. Each phone number can only be used for one account.`,
      );
    }
  }

  /**
   * Check if a GST number is available (not used by another seller).
   */
  async isGstAvailable(
    gstNumber: string,
    excludeSellerId?: string,
  ): Promise<boolean> {
    const normalized = gstNumber.trim().toUpperCase();
    const existing = await this.prisma.sellerProfile.findFirst({
      where: {
        gstNumber: normalized,
        ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  /**
   * Throws ConflictException if GST number is already in use.
   */
  async assertGstAvailable(
    gstNumber: string,
    excludeSellerId?: string,
  ): Promise<void> {
    const available = await this.isGstAvailable(gstNumber, excludeSellerId);
    if (!available) {
      throw new ConflictException(
        'This GST number is already registered with another seller account.',
      );
    }
  }

  /**
   * Check if a bank account number is available (not used by another seller).
   */
  async isBankAccountAvailable(
    accountNumber: string,
    excludeSellerId?: string,
  ): Promise<boolean> {
    const normalized = accountNumber.trim();
    const existing = await this.prisma.sellerProfile.findFirst({
      where: {
        bankAccountNumber: normalized,
        ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  /**
   * Throws ConflictException if bank account is already in use.
   */
  async assertBankAccountAvailable(
    accountNumber: string,
    excludeSellerId?: string,
  ): Promise<void> {
    const available = await this.isBankAccountAvailable(accountNumber, excludeSellerId);
    if (!available) {
      throw new ConflictException(
        'This bank account number is already registered with another seller account.',
      );
    }
  }

  /**
   * Check if a PAN number is available (not used by another seller).
   */
  async isPanAvailable(
    panNumber: string,
    excludeSellerId?: string,
  ): Promise<boolean> {
    const normalized = panNumber.trim().toUpperCase();
    const existing = await this.prisma.sellerProfile.findFirst({
      where: {
        panNumber: normalized,
        ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  /**
   * Throws ConflictException if PAN number is already in use.
   */
  async assertPanAvailable(
    panNumber: string,
    excludeSellerId?: string,
  ): Promise<void> {
    const available = await this.isPanAvailable(panNumber, excludeSellerId);
    if (!available) {
      throw new ConflictException(
        'This PAN number is already registered with another seller account.',
      );
    }
  }

  /**
   * Check if an Aadhaar number is available (not used by another seller).
   */
  async isAadhaarAvailable(
    aadhaarNumber: string,
    excludeSellerId?: string,
  ): Promise<boolean> {
    const normalized = aadhaarNumber.replace(/\s+/g, '').trim();
    const existing = await this.prisma.sellerProfile.findFirst({
      where: {
        aadhaarNumber: normalized,
        ...(excludeSellerId ? { id: { not: excludeSellerId } } : {}),
      },
      select: { id: true },
    });
    return !existing;
  }

  /**
   * Throws ConflictException if Aadhaar number is already in use.
   */
  async assertAadhaarAvailable(
    aadhaarNumber: string,
    excludeSellerId?: string,
  ): Promise<void> {
    const available = await this.isAadhaarAvailable(aadhaarNumber, excludeSellerId);
    if (!available) {
      throw new ConflictException(
        'This Aadhaar number is already registered with another seller account.',
      );
    }
  }

  /**
   * Validate all seller KYC fields at once. Useful for profile updates.
   * Only checks fields that are provided (non-null/undefined).
   */
  async validateSellerKycFields(
    fields: {
      gstNumber?: string | null;
      bankAccountNumber?: string | null;
      panNumber?: string | null;
      aadhaarNumber?: string | null;
    },
    excludeSellerId?: string,
  ): Promise<void> {
    const checks: Promise<void>[] = [];

    if (fields.gstNumber) {
      checks.push(this.assertGstAvailable(fields.gstNumber, excludeSellerId));
    }
    if (fields.bankAccountNumber) {
      checks.push(this.assertBankAccountAvailable(fields.bankAccountNumber, excludeSellerId));
    }
    if (fields.panNumber) {
      checks.push(this.assertPanAvailable(fields.panNumber, excludeSellerId));
    }
    if (fields.aadhaarNumber) {
      checks.push(this.assertAadhaarAvailable(fields.aadhaarNumber, excludeSellerId));
    }

    await Promise.all(checks);
  }

  /**
   * Get all accounts that share identifiers (for admin audit).
   * Returns a report of potential duplicate accounts.
   */
  async getDuplicateIdentifiersReport(): Promise<{
    duplicateEmails: Array<{ email: string; accounts: Array<{ id: string; role: string }> }>;
    duplicatePhones: Array<{ phone: string; accounts: Array<{ id: string; role: string }> }>;
    duplicateGst: Array<{ gstNumber: string; sellers: Array<{ id: string; storeName: string }> }>;
    duplicateBankAccounts: Array<{ accountNumber: string; sellers: Array<{ id: string; storeName: string }> }>;
    duplicatePan: Array<{ panNumber: string; sellers: Array<{ id: string; storeName: string }> }>;
    duplicateAadhaar: Array<{ aadhaarNumber: string; sellers: Array<{ id: string; storeName: string }> }>;
  }> {
    // Find duplicate emails across roles
    const emailGroups = await this.prisma.user.groupBy({
      by: ['email'],
      where: { email: { not: null } },
      _count: { email: true },
      having: { email: { _count: { gt: 1 } } },
    });

    const duplicateEmails = await Promise.all(
      emailGroups.map(async (group) => {
        const accounts = await this.prisma.user.findMany({
          where: { email: group.email },
          select: { id: true, role: true },
        });
        return { email: group.email!, accounts: accounts.map((a) => ({ id: a.id, role: a.role })) };
      }),
    );

    // Find duplicate phones across roles
    const phoneGroups = await this.prisma.user.groupBy({
      by: ['phone'],
      where: { phone: { not: null } },
      _count: { phone: true },
      having: { phone: { _count: { gt: 1 } } },
    });

    const duplicatePhones = await Promise.all(
      phoneGroups.map(async (group) => {
        const accounts = await this.prisma.user.findMany({
          where: { phone: group.phone },
          select: { id: true, role: true },
        });
        return { phone: group.phone!, accounts: accounts.map((a) => ({ id: a.id, role: a.role })) };
      }),
    );

    // Find duplicate GST numbers
    const gstGroups = await this.prisma.sellerProfile.groupBy({
      by: ['gstNumber'],
      where: { gstNumber: { not: null } },
      _count: { gstNumber: true },
      having: { gstNumber: { _count: { gt: 1 } } },
    });

    const duplicateGst = await Promise.all(
      gstGroups.map(async (group) => {
        const sellers = await this.prisma.sellerProfile.findMany({
          where: { gstNumber: group.gstNumber },
          select: { id: true, storeName: true },
        });
        return { gstNumber: group.gstNumber!, sellers };
      }),
    );

    // Find duplicate bank accounts
    const bankGroups = await this.prisma.sellerProfile.groupBy({
      by: ['bankAccountNumber'],
      where: { bankAccountNumber: { not: null } },
      _count: { bankAccountNumber: true },
      having: { bankAccountNumber: { _count: { gt: 1 } } },
    });

    const duplicateBankAccounts = await Promise.all(
      bankGroups.map(async (group) => {
        const sellers = await this.prisma.sellerProfile.findMany({
          where: { bankAccountNumber: group.bankAccountNumber },
          select: { id: true, storeName: true },
        });
        return { accountNumber: group.bankAccountNumber!, sellers };
      }),
    );

    // Find duplicate PAN numbers
    const panGroups = await this.prisma.sellerProfile.groupBy({
      by: ['panNumber'],
      where: { panNumber: { not: null } },
      _count: { panNumber: true },
      having: { panNumber: { _count: { gt: 1 } } },
    });

    const duplicatePan = await Promise.all(
      panGroups.map(async (group) => {
        const sellers = await this.prisma.sellerProfile.findMany({
          where: { panNumber: group.panNumber },
          select: { id: true, storeName: true },
        });
        return { panNumber: group.panNumber!, sellers };
      }),
    );

    // Find duplicate Aadhaar numbers
    const aadhaarGroups = await this.prisma.sellerProfile.groupBy({
      by: ['aadhaarNumber'],
      where: { aadhaarNumber: { not: null } },
      _count: { aadhaarNumber: true },
      having: { aadhaarNumber: { _count: { gt: 1 } } },
    });

    const duplicateAadhaar = await Promise.all(
      aadhaarGroups.map(async (group) => {
        const sellers = await this.prisma.sellerProfile.findMany({
          where: { aadhaarNumber: group.aadhaarNumber },
          select: { id: true, storeName: true },
        });
        return { aadhaarNumber: group.aadhaarNumber!, sellers };
      }),
    );

    return {
      duplicateEmails,
      duplicatePhones,
      duplicateGst,
      duplicateBankAccounts,
      duplicatePan,
      duplicateAadhaar,
    };
  }

  /**
   * Normalize phone to various formats for lookup.
   */
  private getPhoneVariants(phone: string): string[] {
    const digits = phone.replace(/\D/g, '');
    const variants = new Set<string>();
    variants.add(phone);

    if (digits.startsWith('91') && digits.length === 12) {
      variants.add(`+${digits}`);
      variants.add(digits);
      variants.add(digits.slice(2));
    } else if (digits.length === 10) {
      variants.add(digits);
      variants.add(`+91${digits}`);
      variants.add(`91${digits}`);
    }

    return Array.from(variants);
  }
}

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

const CONVENIENCE_FEE_PERCENT = 2;

@Injectable()
export class WalletService {
  private razorpay: Razorpay | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const keyId = this.config.get('RAZORPAY_KEY_ID') || '';
    const keySecret = this.config.get('RAZORPAY_KEY_SECRET') || '';
    const isPlaceholder = (v: string) => !v || v.startsWith('your-') || v === 'test' || v.length < 10;
    if (!isPlaceholder(keyId) && !isPlaceholder(keySecret)) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }

  private getRazorpay(): Razorpay {
    if (!this.razorpay) {
      throw new HttpException('Payment gateway not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.razorpay;
  }

  async getOrCreateWallet(ownerId: string, ownerType: 'ADMIN' | 'SELLER' | 'CUSTOMER') {
    return this.prisma.wallet.upsert({
      where: { ownerId_ownerType: { ownerId, ownerType } },
      create: { ownerId, ownerType, balance: 0 },
      update: {},
    });
  }

  async getBalance(ownerId: string, ownerType: 'ADMIN' | 'SELLER' | 'CUSTOMER') {
    const wallet = await this.prisma.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId, ownerType } },
    });
    if (!wallet) {
      return { balance: 0, walletId: null };
    }
    return { balance: wallet.balance, walletId: wallet.id };
  }

  async getTransactions(
    ownerId: string,
    ownerType: 'ADMIN' | 'SELLER' | 'CUSTOMER',
    page = 1,
    limit = 20,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId, ownerType } },
    });

    if (!wallet) {
      return { transactions: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      transactions,
      balance: wallet.balance,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async credit(
    walletId: string,
    amount: number,
    description: string,
    createdBy?: string,
    referenceType: string = 'MANUAL',
    referenceId?: string,
  ) {
    if (amount <= 0) {
      throw new HttpException('Amount must be positive', HttpStatus.BAD_REQUEST);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }

    const newBalance = wallet.balance + amount;

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId,
          type: 'CREDIT',
          amount,
          balanceAfter: newBalance,
          description,
          referenceType: referenceType as any,
          referenceId,
          createdBy,
        },
      }),
    ]);

    return { wallet: updatedWallet, transaction };
  }

  async debit(
    walletId: string,
    amount: number,
    description: string,
    createdBy?: string,
    referenceType: string = 'MANUAL',
    referenceId?: string,
  ) {
    if (amount <= 0) {
      throw new HttpException('Amount must be positive', HttpStatus.BAD_REQUEST);
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }

    if (wallet.balance < amount) {
      throw new HttpException('Insufficient balance', HttpStatus.BAD_REQUEST);
    }

    const newBalance = wallet.balance - amount;

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId,
          type: 'DEBIT',
          amount,
          balanceAfter: newBalance,
          description,
          referenceType: referenceType as any,
          referenceId,
          createdBy,
        },
      }),
    ]);

    return { wallet: updatedWallet, transaction };
  }

  async requestPayout(userId: string, amount: number, notes?: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId: userId, ownerType: 'SELLER' } },
    });

    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }

    if (wallet.balance < amount) {
      throw new HttpException('Insufficient balance', HttpStatus.BAD_REQUEST);
    }

    const newBalance = wallet.balance - amount;

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          balanceAfter: newBalance,
          description: notes ? `Payout request: ${notes}` : 'Payout request to bank account',
          referenceType: 'PAYOUT',
          createdBy: userId,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Payout request submitted',
      transaction,
      newBalance: updatedWallet.balance,
    };
  }

  async getAllWallets(page = 1, limit = 20) {
    // Ensure every verified seller has a wallet row
    const sellers = await this.prisma.sellerProfile.findMany({
      where: { verified: true, userId: { not: null } },
      select: { userId: true },
    });
    if (sellers.length > 0) {
      await Promise.all(
        sellers.map((s) =>
          this.prisma.wallet.upsert({
            where: { ownerId_ownerType: { ownerId: s.userId!, ownerType: 'SELLER' } },
            create: { ownerId: s.userId!, ownerType: 'SELLER', balance: 0 },
            update: {},
          }),
        ),
      );
    }

    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      this.prisma.wallet.findMany({
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.wallet.count(),
    ]);

    const enriched = await Promise.all(
      wallets.map(async (w) => {
        let ownerName = 'Unknown';
        let ownerEmail = '';
        if (w.ownerType === 'SELLER') {
          const seller = await this.prisma.sellerProfile.findFirst({
            where: { userId: w.ownerId },
            select: { storeName: true, email: true },
          });
          if (seller) {
            ownerName = seller.storeName;
            ownerEmail = seller.email || '';
          }
        } else {
          const user = await this.prisma.user.findUnique({
            where: { id: w.ownerId },
            select: { name: true, email: true },
          });
          if (user) {
            ownerName = user.name;
            ownerEmail = user.email;
          }
        }
        return { ...w, ownerName, ownerEmail };
      }),
    );

    return {
      wallets: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getWalletById(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }
    return wallet;
  }

  // ========== Add Money (2% convenience fee) ==========

  async createAddMoneyOrder(userId: string, amount: number) {
    if (amount < 10) {
      throw new HttpException('Minimum add money amount is ₹10', HttpStatus.BAD_REQUEST);
    }

    const wallet = await this.getOrCreateWallet(userId, 'CUSTOMER');
    const fee = Math.round(amount * CONVENIENCE_FEE_PERCENT) / 100;
    const totalCharge = amount + fee;
    const amountInPaise = Math.round(totalCharge * 100);

    const razorpayOrder = await this.getRazorpay().orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `wallet-${wallet.id}-${Date.now()}`,
      notes: { userId, walletId: wallet.id, walletAmount: amount, fee, purpose: 'WALLET_TOPUP' },
    });

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: totalCharge,
      walletCredit: amount,
      convenienceFee: fee,
      feePercent: CONVENIENCE_FEE_PERCENT,
      currency: 'INR',
      keyId: this.config.get('RAZORPAY_KEY_ID'),
    };
  }

  async verifyAddMoney(
    userId: string,
    payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    const secret = this.config.get('RAZORPAY_KEY_SECRET') || '';
    const body = payload.razorpay_order_id + '|' + payload.razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expectedSignature !== payload.razorpay_signature) {
      throw new HttpException('Invalid payment signature', HttpStatus.BAD_REQUEST);
    }

    const order = await this.getRazorpay().orders.fetch(payload.razorpay_order_id);
    const notes = order.notes as Record<string, any>;

    if (notes?.userId !== userId || notes?.purpose !== 'WALLET_TOPUP') {
      throw new HttpException('Payment mismatch', HttpStatus.BAD_REQUEST);
    }

    const walletAmount = Number(notes.walletAmount);
    const wallet = await this.getOrCreateWallet(userId, 'CUSTOMER');

    return this.credit(
      wallet.id,
      walletAmount,
      `Added ₹${walletAmount} to wallet (incl. ${CONVENIENCE_FEE_PERCENT}% fee)`,
      userId,
      'WALLET_TOPUP',
      payload.razorpay_payment_id,
    );
  }

  // ========== Bank Transfer ==========

  async requestBankTransfer(
    userId: string,
    amount: number,
    accountNumber: string,
    ifscCode: string,
    accountHolder: string,
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId: userId, ownerType: 'CUSTOMER' } },
    });
    if (!wallet) throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    if (wallet.balance < amount) throw new HttpException('Insufficient balance', HttpStatus.BAD_REQUEST);
    if (amount < 100) throw new HttpException('Minimum transfer amount is ₹100', HttpStatus.BAD_REQUEST);

    const newBalance = wallet.balance - amount;

    const [updatedWallet, transaction, transferRequest] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          balanceAfter: newBalance,
          description: `Bank transfer to ${accountHolder} (A/C: ***${accountNumber.slice(-4)})`,
          referenceType: 'TRANSFER',
          createdBy: userId,
        },
      }),
      this.prisma.bankTransferRequest.create({
        data: { walletId: wallet.id, userId, amount, accountNumber, ifscCode, accountHolder },
      }),
    ]);

    return { wallet: updatedWallet, transaction, transferRequest };
  }

  async getBankTransfers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transfers, total] = await Promise.all([
      this.prisma.bankTransferRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bankTransferRequest.count({ where: { userId } }),
    ]);
    return { transfers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ========== Recharge ==========

  async processRecharge(
    userId: string,
    amount: number,
    identifier: string,
    operator: string,
    type = 'mobile',
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId: userId, ownerType: 'CUSTOMER' } },
    });
    if (!wallet) throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    if (wallet.balance < amount) throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST);

    const newBalance = wallet.balance - amount;
    const rechargeRef = `RCH-${Date.now().toString(36).toUpperCase()}`;

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          balanceAfter: newBalance,
          description: `${type === 'dth' ? 'DTH' : 'Mobile'} recharge — ${operator} (${identifier})`,
          referenceType: 'RECHARGE',
          referenceId: rechargeRef,
          createdBy: userId,
        },
      }),
    ]);

    return {
      wallet: updatedWallet,
      transaction,
      recharge: { referenceId: rechargeRef, status: 'PROCESSING', identifier, operator, type, amount },
    };
  }

  // ========== Bill Payment ==========

  async processBillPayment(
    userId: string,
    amount: number,
    billerId: string,
    consumerNumber: string,
    category = 'other',
  ) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { ownerId_ownerType: { ownerId: userId, ownerType: 'CUSTOMER' } },
    });
    if (!wallet) throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    if (wallet.balance < amount) throw new HttpException('Insufficient wallet balance', HttpStatus.BAD_REQUEST);

    const newBalance = wallet.balance - amount;
    const billRef = `BILL-${Date.now().toString(36).toUpperCase()}`;

    const [updatedWallet, transaction] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          balanceAfter: newBalance,
          description: `Bill payment — ${category} (${billerId}, ${consumerNumber})`,
          referenceType: 'BILL_PAYMENT',
          referenceId: billRef,
          createdBy: userId,
        },
      }),
    ]);

    return {
      wallet: updatedWallet,
      transaction,
      billPayment: { referenceId: billRef, status: 'PROCESSING', billerId, consumerNumber, category, amount },
    };
  }
}

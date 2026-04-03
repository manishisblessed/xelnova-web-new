import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(ownerId: string, ownerType: 'ADMIN' | 'SELLER') {
    return this.prisma.wallet.upsert({
      where: { ownerId_ownerType: { ownerId, ownerType } },
      create: { ownerId, ownerType, balance: 0 },
      update: {},
    });
  }

  async getBalance(ownerId: string, ownerType: 'ADMIN' | 'SELLER') {
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
    ownerType: 'ADMIN' | 'SELLER',
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
}

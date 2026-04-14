import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.featureFlag.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByKey(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundException(`Feature flag '${key}' not found`);
    return flag;
  }

  async create(data: { key: string; name: string; description?: string; enabled?: boolean; percentage?: number }) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key: data.key } });
    if (existing) throw new ConflictException(`Feature flag '${data.key}' already exists`);

    return this.prisma.featureFlag.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        enabled: data.enabled ?? false,
        percentage: data.percentage ?? 100,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string; enabled?: boolean; percentage?: number }) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');

    return this.prisma.featureFlag.update({ where: { id }, data });
  }

  async delete(id: string) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException('Feature flag not found');
    await this.prisma.featureFlag.delete({ where: { id } });
    return { deleted: true };
  }

  async isEnabled(key: string, userId?: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag || !flag.enabled) return false;
    if (flag.percentage >= 100) return true;
    if (flag.percentage <= 0) return false;

    // Deterministic hash based on flag key + userId for consistent rollout
    const seed = userId ? `${key}:${userId}` : `${key}:${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 100) < flag.percentage;
  }

  async getPublicFlags(userId?: string): Promise<Record<string, boolean>> {
    const flags = await this.prisma.featureFlag.findMany({ where: { enabled: true } });
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = await this.isEnabled(flag.key, userId);
    }
    return result;
  }
}

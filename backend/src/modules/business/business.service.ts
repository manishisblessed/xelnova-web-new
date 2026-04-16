import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/business.dto';
import { OrganizationMemberRole } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizationsForUser(userId: string) {
    const rows = await this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      select: {
        id: true,
        name: true,
        legalName: true,
        gstin: true,
        updatedAt: true,
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((o) => ({
      id: o.id,
      name: o.name,
      legalName: o.legalName,
      gstin: o.gstin,
      updatedAt: o.updatedAt,
      myRole: o.members[0]?.role ?? ('BUYER' as OrganizationMemberRole),
    }));
  }

  async getOrganizationForUser(userId: string, organizationId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        members: { some: { userId } },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const { members, ...rest } = org;
    return {
      ...rest,
      myRole: members[0]?.role ?? ('BUYER' as OrganizationMemberRole),
    };
  }

  async updateOrganization(userId: string, organizationId: string, dto: UpdateOrganizationDto) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });
    if (!membership) {
      throw new NotFoundException('Organization not found');
    }
    if (membership.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only an organization admin can update company details');
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.legalName !== undefined ? { legalName: dto.legalName?.trim() || null } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin?.trim().toUpperCase() || null } : {}),
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

export interface LocationData {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

export interface ActivityLogData {
  type: string;
  action: string;
  message: string;
  userId?: string;
  userRole?: Role;
  ipAddress?: string;
  userAgent?: string;
  location?: LocationData;
  meta?: Record<string, any>;
  duration?: number;
  status?: string;
  endpoint?: string;
  method?: string;
}

export interface ApiRequestLogData {
  method: string;
  endpoint: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  location?: LocationData;
}

export interface PerformanceLogData {
  type: string;
  metric: string;
  value: number;
  unit: string;
  endpoint?: string;
  memoryUsage?: number;
  cpuUsage?: number;
  activeUsers?: number;
  requestCount?: number;
  errorCount?: number;
  avgResponseMs?: number;
  meta?: Record<string, any>;
}

@Injectable()
export class LoggingService {
  constructor(private prisma: PrismaService) {}

  async getLocationFromIP(ip: string): Promise<LocationData> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { ip, city: 'Local', region: 'Local', country: 'Local' };
    }

    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,query`);
      const data = await response.json();

      if (data.status === 'success') {
        return {
          ip: data.query,
          city: data.city,
          region: data.regionName,
          country: data.country,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          isp: data.isp,
        };
      }
    } catch (error) {
      console.error('Failed to get location from IP:', error);
    }

    return { ip };
  }

  async logActivity(data: ActivityLogData) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          type: data.type,
          action: data.action,
          message: data.message,
          userId: data.userId,
          userRole: data.userRole,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          location: data.location as any,
          meta: data.meta as any,
          duration: data.duration,
          status: data.status || 'success',
          endpoint: data.endpoint,
          method: data.method,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      return null;
    }
  }

  async logApiRequest(data: ApiRequestLogData) {
    try {
      return await this.prisma.apiRequestLog.create({
        data: {
          method: data.method,
          endpoint: data.endpoint,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          requestBody: data.requestBody as any,
          responseBody: data.responseBody as any,
          error: data.error,
          location: data.location as any,
        },
      });
    } catch (error) {
      console.error('Failed to log API request:', error);
      return null;
    }
  }

  async logPerformance(data: PerformanceLogData) {
    try {
      return await this.prisma.performanceLog.create({
        data: {
          type: data.type,
          metric: data.metric,
          value: data.value,
          unit: data.unit,
          endpoint: data.endpoint,
          memoryUsage: data.memoryUsage,
          cpuUsage: data.cpuUsage,
          activeUsers: data.activeUsers,
          requestCount: data.requestCount,
          errorCount: data.errorCount,
          avgResponseMs: data.avgResponseMs,
          meta: data.meta as any,
        },
      });
    } catch (error) {
      console.error('Failed to log performance:', error);
      return null;
    }
  }

  async logUserLogin(userId: string, userRole: Role, ipAddress: string, userAgent: string) {
    const location = await this.getLocationFromIP(ipAddress);
    
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginLocation: location as any,
        loginCount: { increment: 1 },
      },
    });

    return this.logActivity({
      type: 'AUTH',
      action: 'LOGIN',
      message: `User logged in from ${location.city || 'Unknown'}, ${location.country || 'Unknown'}`,
      userId,
      userRole,
      ipAddress,
      userAgent,
      location,
      meta: { loginTime: new Date().toISOString() },
    });
  }

  async logUserLogout(userId: string, userRole: Role, ipAddress: string, userAgent: string) {
    const location = await this.getLocationFromIP(ipAddress);
    
    return this.logActivity({
      type: 'AUTH',
      action: 'LOGOUT',
      message: 'User logged out',
      userId,
      userRole,
      ipAddress,
      userAgent,
      location,
    });
  }

  async logUserRegistration(userId: string, userRole: Role, ipAddress: string, userAgent: string) {
    const location = await this.getLocationFromIP(ipAddress);
    
    return this.logActivity({
      type: 'AUTH',
      action: 'REGISTER',
      message: `New ${userRole.toLowerCase()} registered from ${location.city || 'Unknown'}, ${location.country || 'Unknown'}`,
      userId,
      userRole,
      ipAddress,
      userAgent,
      location,
    });
  }

  async createUserSession(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    expiresAt: Date,
  ) {
    const location = await this.getLocationFromIP(ipAddress);
    const deviceInfo = this.parseUserAgent(userAgent);

    return this.prisma.userSession.create({
      data: {
        userId,
        token,
        ipAddress,
        userAgent,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        location: location as any,
        city: location.city,
        region: location.region,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        expiresAt,
      },
    });
  }

  async updateSessionActivity(token: string) {
    try {
      await this.prisma.userSession.update({
        where: { token },
        data: { lastActivity: new Date() },
      });
    } catch (error) {
      // Session might not exist
    }
  }

  async invalidateSession(token: string) {
    try {
      await this.prisma.userSession.update({
        where: { token },
        data: { isActive: false },
      });
    } catch (error) {
      // Session might not exist
    }
  }

  async invalidateAllUserSessions(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
  }

  private parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
    const result = { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
    
    if (!userAgent) return result;

    if (/mobile/i.test(userAgent)) result.device = 'Mobile';
    else if (/tablet/i.test(userAgent)) result.device = 'Tablet';
    else result.device = 'Desktop';

    if (/chrome/i.test(userAgent)) result.browser = 'Chrome';
    else if (/firefox/i.test(userAgent)) result.browser = 'Firefox';
    else if (/safari/i.test(userAgent)) result.browser = 'Safari';
    else if (/edge/i.test(userAgent)) result.browser = 'Edge';
    else if (/opera/i.test(userAgent)) result.browser = 'Opera';

    if (/windows/i.test(userAgent)) result.os = 'Windows';
    else if (/macintosh|mac os/i.test(userAgent)) result.os = 'macOS';
    else if (/linux/i.test(userAgent)) result.os = 'Linux';
    else if (/android/i.test(userAgent)) result.os = 'Android';
    else if (/iphone|ipad/i.test(userAgent)) result.os = 'iOS';

    return result;
  }

  async getActivityLogs(filters: {
    type?: string;
    action?: string;
    userId?: string;
    userRole?: Role;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { type, action, userId, userRole, status, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (userRole) where.userRole = userRole;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
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

  async getApiRequestLogs(filters: {
    method?: string;
    endpoint?: string;
    statusCode?: number;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { method, endpoint, statusCode, userId, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (method) where.method = method;
    if (endpoint) where.endpoint = { contains: endpoint };
    if (statusCode) where.statusCode = statusCode;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.apiRequestLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiRequestLog.count({ where }),
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

  async getPerformanceLogs(filters: {
    type?: string;
    metric?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { type, metric, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (metric) where.metric = metric;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.performanceLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.performanceLog.count({ where }),
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

  async getUserSessions(userId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.userId = userId;

    const [sessions, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { lastActivity: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPerformanceStats(period: 'hour' | 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [
      totalRequests,
      errorRequests,
      avgResponseTime,
      activeUsers,
      recentActivities,
      topEndpoints,
    ] = await Promise.all([
      this.prisma.apiRequestLog.count({ where: { createdAt: { gte: startDate } } }),
      this.prisma.apiRequestLog.count({ where: { createdAt: { gte: startDate }, statusCode: { gte: 400 } } }),
      this.prisma.apiRequestLog.aggregate({
        where: { createdAt: { gte: startDate } },
        _avg: { responseTime: true },
      }),
      this.prisma.userSession.count({ where: { isActive: true, lastActivity: { gte: startDate } } }),
      this.prisma.activityLog.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.apiRequestLog.groupBy({
        by: ['endpoint'],
        where: { createdAt: { gte: startDate } },
        _count: { endpoint: true },
        _avg: { responseTime: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      period,
      startDate,
      endDate: now,
      stats: {
        totalRequests,
        errorRequests,
        errorRate: totalRequests > 0 ? ((errorRequests / totalRequests) * 100).toFixed(2) : 0,
        avgResponseTime: avgResponseTime._avg.responseTime?.toFixed(2) || 0,
        activeUsers,
      },
      recentActivities,
      topEndpoints: topEndpoints.map(e => ({
        endpoint: e.endpoint,
        count: e._count.endpoint,
        avgResponseTime: e._avg.responseTime?.toFixed(2) || 0,
      })),
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      todayLogins,
      weekLogins,
      monthLogins,
      todayRegistrations,
      todayOrders,
      activeSessionsCount,
      errorCountToday,
      activityByType,
    ] = await Promise.all([
      this.prisma.activityLog.count({ where: { action: 'LOGIN', createdAt: { gte: today } } }),
      this.prisma.activityLog.count({ where: { action: 'LOGIN', createdAt: { gte: thisWeek } } }),
      this.prisma.activityLog.count({ where: { action: 'LOGIN', createdAt: { gte: thisMonth } } }),
      this.prisma.activityLog.count({ where: { action: 'REGISTER', createdAt: { gte: today } } }),
      this.prisma.activityLog.count({ where: { type: 'ORDER', createdAt: { gte: today } } }),
      this.prisma.userSession.count({ where: { isActive: true } }),
      this.prisma.apiRequestLog.count({ where: { statusCode: { gte: 400 }, createdAt: { gte: today } } }),
      this.prisma.activityLog.groupBy({
        by: ['type'],
        where: { createdAt: { gte: thisWeek } },
        _count: { type: true },
      }),
    ]);

    return {
      logins: { today: todayLogins, week: weekLogins, month: monthLogins },
      registrations: { today: todayRegistrations },
      orders: { today: todayOrders },
      activeSessions: activeSessionsCount,
      errorsToday: errorCountToday,
      activityByType: activityByType.map(a => ({ type: a.type, count: a._count.type })),
    };
  }
}

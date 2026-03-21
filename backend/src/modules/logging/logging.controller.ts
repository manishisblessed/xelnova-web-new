import { Controller, Get, Query } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { Role } from '../../../generated/prisma/enums';

@Controller('logs')
@Auth('ADMIN')
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  @Get('activity')
  async getActivityLogs(
    @Query('type') type?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('userRole') userRole?: Role,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.loggingService.getActivityLogs({
      type,
      action,
      userId,
      userRole,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    return { success: true, ...data };
  }

  @Get('api-requests')
  async getApiRequestLogs(
    @Query('method') method?: string,
    @Query('endpoint') endpoint?: string,
    @Query('statusCode') statusCode?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.loggingService.getApiRequestLogs({
      method,
      endpoint,
      statusCode: statusCode ? parseInt(statusCode) : undefined,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    return { success: true, ...data };
  }

  @Get('performance')
  async getPerformanceLogs(
    @Query('type') type?: string,
    @Query('metric') metric?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.loggingService.getPerformanceLogs({
      type,
      metric,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    return { success: true, ...data };
  }

  @Get('sessions')
  async getUserSessions(
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.loggingService.getUserSessions(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, ...data };
  }

  @Get('stats')
  async getPerformanceStats(@Query('period') period?: 'hour' | 'day' | 'week' | 'month') {
    const data = await this.loggingService.getPerformanceStats(period || 'day');
    return { success: true, data };
  }

  @Get('dashboard')
  async getDashboardStats() {
    const data = await this.loggingService.getDashboardStats();
    return { success: true, data };
  }
}

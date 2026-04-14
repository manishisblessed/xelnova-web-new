import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get all enabled feature flags for current user' })
  async getPublicFlags(@Query('userId') userId?: string) {
    return successResponse(
      await this.service.getPublicFlags(userId),
      'Feature flags fetched',
    );
  }

  @Get('check/:key')
  @ApiOperation({ summary: 'Check if a specific flag is enabled' })
  async checkFlag(@Param('key') key: string, @Query('userId') userId?: string) {
    return successResponse(
      { key, enabled: await this.service.isEnabled(key, userId) },
      'Flag checked',
    );
  }
}

@ApiTags('Admin Feature Flags')
@Controller('admin/feature-flags')
@Auth('ADMIN' as any)
export class AdminFeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all feature flags' })
  async findAll() {
    return successResponse(await this.service.findAll(), 'Feature flags fetched');
  }

  @Post()
  @ApiOperation({ summary: 'Create a feature flag' })
  async create(@Body() body: { key: string; name: string; description?: string; enabled?: boolean; percentage?: number }) {
    return successResponse(await this.service.create(body), 'Feature flag created');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feature flag' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; enabled?: boolean; percentage?: number },
  ) {
    return successResponse(await this.service.update(id, body), 'Feature flag updated');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a feature flag' })
  async delete(@Param('id') id: string) {
    return successResponse(await this.service.delete(id), 'Feature flag deleted');
  }
}

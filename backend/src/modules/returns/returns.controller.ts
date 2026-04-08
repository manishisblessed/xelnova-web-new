import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto, UpdateReturnStatusDto, ReversePickupDto } from './dto/return.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Returns')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Request a return/refund (customer)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnDto,
  ) {
    const result = await this.returnsService.create(
      userId,
      dto.orderNumber,
      dto.reason,
    );
    return successResponse(result, 'Return request submitted');
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List my return requests' })
  async findAll(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.returnsService.findAllForUser(userId),
      'Return requests fetched',
    );
  }

  @Get('admin')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'List all return requests (admin)' })
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.returnsService.findAllAdmin(
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
    return successResponse(result, 'Return requests fetched');
  }

  @Patch(':id/status')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Update return request status (admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    const result = await this.returnsService.updateStatus(
      id,
      dto.status,
      dto.adminNote,
      dto.refundAmount,
    );
    return successResponse(result, 'Return request updated');
  }

  @Post(':id/reverse-pickup')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Schedule reverse pickup for return' })
  async scheduleReversePickup(
    @Param('id') id: string,
    @Body() dto: ReversePickupDto,
  ) {
    const result = await this.returnsService.scheduleReversePickup(
      id,
      dto.courier,
      dto.awb,
      dto.trackingUrl,
      dto.pickupDate,
    );
    return successResponse(result, 'Reverse pickup scheduled');
  }
}

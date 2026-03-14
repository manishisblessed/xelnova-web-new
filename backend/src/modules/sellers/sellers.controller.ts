import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SellersService } from './sellers.service';
import { successResponse, errorResponse } from '../../common/helpers/response.helper';

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get seller profile' })
  findById(@Param('id') id: string) {
    const seller = this.sellersService.findById(id);
    if (!seller) {
      return errorResponse('Seller not found');
    }
    return successResponse(seller, 'Seller fetched successfully');
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get seller products' })
  findProducts(@Param('id') id: string) {
    const seller = this.sellersService.findById(id);
    if (!seller) {
      return errorResponse('Seller not found');
    }
    return successResponse(
      { seller, products: this.sellersService.findProducts(id) },
      'Seller products fetched successfully',
    );
  }
}

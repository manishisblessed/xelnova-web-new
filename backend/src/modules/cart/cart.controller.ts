import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartDto, ApplyCouponDto } from './dto/cart.dto';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('shipping-config')
  @ApiOperation({ summary: 'Get shipping configuration (public)' })
  async getShippingConfig() {
    return successResponse(
      await this.cartService.getShippingConfig(),
      'Shipping config fetched',
    );
  }

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get cart contents' })
  async getCart(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.cartService.getCart(userId),
      'Cart fetched successfully',
    );
  }

  @Post('add')
  @Auth()
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return successResponse(
      await this.cartService.addItem(userId, dto),
      'Item added to cart',
    );
  }

  @Put('update')
  @Auth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return successResponse(
      await this.cartService.updateItem(userId, dto),
      'Cart updated successfully',
    );
  }

  @Delete('remove/:id')
  @Auth()
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return successResponse(
      await this.cartService.removeItem(userId, id),
      'Item removed from cart',
    );
  }

  @Post('coupon/apply')
  @Auth()
  @ApiOperation({ summary: 'Apply coupon code' })
  async applyCoupon(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    return successResponse(
      await this.cartService.applyCoupon(userId, dto.code),
      'Coupon applied successfully',
    );
  }
}

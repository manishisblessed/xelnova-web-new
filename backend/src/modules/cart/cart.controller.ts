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
import { successResponse, errorResponse } from '../../common/helpers/response.helper';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart contents' })
  getCart(): ApiResponse {
    return successResponse(this.cartService.getCart(), 'Cart fetched successfully');
  }

  @Post('add')
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(@Body() dto: AddToCartDto): ApiResponse {
    const result = this.cartService.addItem(dto);
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'Item added to cart');
  }

  @Put('update')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(@Body() dto: UpdateCartDto): ApiResponse {
    const result = this.cartService.updateItem(dto);
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'Cart updated successfully');
  }

  @Delete('remove/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(@Param('id') id: string): ApiResponse {
    const result = this.cartService.removeItem(id);
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'Item removed from cart');
  }

  @Post('coupon/apply')
  @ApiOperation({ summary: 'Apply coupon code' })
  applyCoupon(@Body() dto: ApplyCouponDto): ApiResponse {
    const result = this.cartService.applyCoupon(dto.code);
    if ('error' in result) {
      return errorResponse(result.error as string);
    }
    return successResponse(result, 'Coupon applied successfully');
  }

  @Delete('coupon/remove')
  @ApiOperation({ summary: 'Remove applied coupon' })
  removeCoupon(): ApiResponse {
    return successResponse(
      this.cartService.removeCoupon(),
      'Coupon removed successfully',
    );
  }
}

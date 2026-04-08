import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'Get wishlist products' })
  async getWishlist(@CurrentUser('id') userId: string) {
    return successResponse(await this.wishlistService.getWishlist(userId), 'Wishlist fetched');
  }

  @Get('ids')
  @Auth()
  @ApiOperation({ summary: 'Get wishlist product IDs only' })
  async getWishlistIds(@CurrentUser('id') userId: string) {
    return successResponse(await this.wishlistService.getWishlistIds(userId), 'Wishlist IDs fetched');
  }

  @Post(':productId/toggle')
  @Auth()
  @ApiOperation({ summary: 'Toggle product in wishlist' })
  async toggle(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return successResponse(await this.wishlistService.toggle(userId, productId), 'Wishlist updated');
  }

  @Post(':productId')
  @Auth()
  @ApiOperation({ summary: 'Add product to wishlist' })
  async add(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return successResponse(await this.wishlistService.add(userId, productId), 'Added to wishlist');
  }

  @Delete(':productId')
  @Auth()
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async remove(@CurrentUser('id') userId: string, @Param('productId') productId: string) {
    return successResponse(await this.wishlistService.remove(userId, productId), 'Removed from wishlist');
  }
}

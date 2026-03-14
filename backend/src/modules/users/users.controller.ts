import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  getProfile() {
    return successResponse(
      this.usersService.getProfile(),
      'Profile fetched successfully',
    );
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@Body() body: { name?: string; email?: string; phone?: string }) {
    return successResponse(
      this.usersService.updateProfile(body),
      'Profile updated successfully',
    );
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get user addresses' })
  getAddresses() {
    return successResponse(
      this.usersService.getAddresses(),
      'Addresses fetched successfully',
    );
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new address' })
  addAddress(
    @Body()
    body: {
      fullName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      pincode: string;
      landmark?: string;
      type: string;
    },
  ) {
    return successResponse(
      this.usersService.addAddress(body),
      'Address added successfully',
    );
  }

  @Get('wishlist')
  @ApiOperation({ summary: 'Get user wishlist' })
  getWishlist() {
    return successResponse(
      this.usersService.getWishlist(),
      'Wishlist fetched successfully',
    );
  }

  @Post('wishlist/toggle')
  @ApiOperation({ summary: 'Toggle product in wishlist' })
  toggleWishlist(@Body() body: { productId: string }) {
    return successResponse(
      this.usersService.toggleWishlist(body.productId),
      'Wishlist updated',
    );
  }
}

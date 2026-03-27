import { Controller, Get, Put, Post, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { successResponse } from '../../common/helpers/response.helper';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Auth()
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.usersService.getProfile(userId),
      'Profile fetched successfully',
    );
  }

  @Put('profile')
  @Auth()
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { name?: string; email?: string; phone?: string },
  ) {
    return successResponse(
      await this.usersService.updateProfile(userId, body),
      'Profile updated successfully',
    );
  }

  @Patch('password')
  @Auth()
  @ApiOperation({ summary: 'Set or change password (OAuth/phone: no current password; email: requires current)' })
  async changePassword(@CurrentUser('id') userId: string, @Body() body: ChangePasswordDto) {
    await this.usersService.changePassword(userId, body);
    return successResponse(null, 'Password updated successfully');
  }

  @Get('addresses')
  @Auth()
  @ApiOperation({ summary: 'Get user addresses' })
  async getAddresses(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.usersService.getAddresses(userId),
      'Addresses fetched successfully',
    );
  }

  @Post('addresses')
  @Auth()
  @ApiOperation({ summary: 'Add a new address' })
  async addAddress(
    @CurrentUser('id') userId: string,
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
      await this.usersService.addAddress(userId, body),
      'Address added successfully',
    );
  }

  @Get('wishlist')
  @Auth()
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@CurrentUser('id') userId: string) {
    return successResponse(
      await this.usersService.getWishlist(userId),
      'Wishlist fetched successfully',
    );
  }

  @Post('wishlist/toggle')
  @Auth()
  @ApiOperation({ summary: 'Toggle product in wishlist' })
  async toggleWishlist(
    @CurrentUser('id') userId: string,
    @Body() body: { productId: string },
  ) {
    return successResponse(
      await this.usersService.toggleWishlist(userId, body.productId),
      'Wishlist updated',
    );
  }
}

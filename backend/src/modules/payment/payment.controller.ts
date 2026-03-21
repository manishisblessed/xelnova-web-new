import { Controller, Post, Body, Headers, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order/:orderId')
  @Auth()
  @ApiOperation({ summary: 'Create Razorpay order for payment' })
  async createOrder(@CurrentUser('id') userId: string, @Param('orderId') orderId: string) {
    return successResponse(await this.paymentService.createOrder(userId, orderId), 'Payment order created');
  }

  @Post('verify')
  @Auth()
  @ApiOperation({ summary: 'Verify Razorpay payment' })
  async verifyPayment(
    @Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) {
    return successResponse(await this.paymentService.verifyPayment(body), 'Payment verified');
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleWebhook(@Body() body: any, @Headers('x-razorpay-signature') signature: string) {
    return await this.paymentService.handleWebhook(body, signature);
  }

  @Post('refund/:orderId')
  @Auth('ADMIN' as any)
  @ApiOperation({ summary: 'Refund a payment (admin only)' })
  async refund(@Param('orderId') orderId: string, @Body() body: { amount?: number }) {
    return successResponse(await this.paymentService.refund(orderId, body.amount), 'Refund processed');
  }
}

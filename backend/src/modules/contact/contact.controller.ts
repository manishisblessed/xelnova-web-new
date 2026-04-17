import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { SendContactMessageDto, SubscribeNewsletterDto } from './dto/contact.dto';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('message')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a contact form message (public)' })
  async sendMessage(@Body() dto: SendContactMessageDto) {
    const result = await this.contactService.sendContactMessage(dto);
    return successResponse(result, 'Message sent');
  }

  @Post('subscribe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Subscribe to the newsletter (public)' })
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    const result = await this.contactService.subscribeNewsletter(dto.email);
    return successResponse(result, 'Subscribed');
  }
}

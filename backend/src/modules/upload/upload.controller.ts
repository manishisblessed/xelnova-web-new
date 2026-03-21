import {
  Controller, Post, Delete, Param, UploadedFile, UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { successResponse } from '../../common/helpers/response.helper';

@ApiTags('Upload')
@Controller('upload')
@Auth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadImage(file, 'xelnova/products');
    return successResponse(result, 'Image uploaded');
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload multiple images (max 10)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    const results = await this.uploadService.uploadMultiple(files, 'xelnova/products');
    return successResponse(results, 'Images uploaded');
  }

  @Delete(':publicId')
  @ApiOperation({ summary: 'Delete an image by public ID' })
  async deleteImage(@Param('publicId') publicId: string) {
    await this.uploadService.deleteImage(decodeURIComponent(publicId));
    return successResponse(null, 'Image deleted');
  }
}

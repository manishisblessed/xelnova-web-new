import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File, folder = 'xelnova'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: jpg, png, webp, gif');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 5MB');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(new BadRequestException('Upload failed: ' + error.message));
          resolve({ url: result!.secure_url, publicId: result!.public_id });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async uploadMultiple(files: Express.Multer.File[], folder = 'xelnova'): Promise<{ url: string; publicId: string }[]> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {
    let cloudName = this.config.get('CLOUDINARY_CLOUD_NAME');
    let apiKey = this.config.get('CLOUDINARY_API_KEY');
    let apiSecret = this.config.get('CLOUDINARY_API_SECRET');

    const isPlaceholder = (v?: string) => !v || /^your[- ]/.test(v);

    if (isPlaceholder(cloudName) || isPlaceholder(apiKey) || isPlaceholder(apiSecret)) {
      const url = this.config.get<string>('CLOUDINARY_URL');
      if (url) {
        const match = url.match(/^cloudinary:\/\/(\d+):([^@]+)@(.+)$/);
        if (match) {
          apiKey = match[1];
          apiSecret = match[2];
          cloudName = match[3];
        }
      }
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  async uploadImage(file: Express.Multer.File, folder = 'xelnova'): Promise<{ url: string; publicId: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Allowed: jpg, png, webp, gif, pdf');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 5MB');
    }

    const isPdf = file.mimetype === 'application/pdf';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          ...(isPdf
            ? { resource_type: 'raw' as const }
            : {
                transformation: [
                  { width: 1200, height: 1200, crop: 'limit' },
                  { quality: 'auto', fetch_format: 'auto' },
                ],
              }),
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

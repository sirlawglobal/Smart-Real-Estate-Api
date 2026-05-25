import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'real-estate',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit', quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadRequestException('Image upload failed: ' + (error?.message || 'Unknown error')));
          } else {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'real-estate',
  ): Promise<Array<{ url: string; publicId: string }>> {
    return Promise.all(files.map((file) => this.uploadImage(file, folder)));
  }
}

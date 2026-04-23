import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
@Injectable()
export class FileUploadService {
  constructor(private prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private uploadToCloudinary(filePath: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(filePath, (error, result) => {
        if (error || !result) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  }

  async uploadFile(file: Express.Multer.File) {
    try {
      console.log('FILE RECEIVED:', file);
      const uploadResult = await this.uploadToCloudinary(file.path);
      console.log(uploadResult);
      const newlySavedFile = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          publicId: uploadResult.public_id,
          url: uploadResult.secure_url,
        },
      });

      fs.unlinkSync(file.path);
      return newlySavedFile;
    } catch {
      //removing in case of any error  -> form file from local folder
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      throw new InternalServerErrorException(
        'File upload fialed! Please try again after some time',
      );
    }
  }

  async getAllFiles() {
    try {
      const files = await this.prisma.file.findMany({});

      if (!files || files.length === 0) {
        throw new NotFoundException(`Files not found`);
      }

      return files;
    } catch {
      throw new InternalServerErrorException(
        'There was a problem fetching files! Please try again after some time',
      );
    }
  }

  async deleteFile(fileId: string) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Step 1: Delete from DB first
      await this.prisma.file.delete({ where: { id: fileId } });

      // Step 2: Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(file.publicId);
      } catch {
        // Step 3: Cloudinary failed — restore the DB record
        await this.prisma.file.create({ data: file });
        throw new InternalServerErrorException(
          'File deletion failed! Please try again after some time',
        );
      }

      return { message: 'File deleted successfully' };
    } catch {
      throw new InternalServerErrorException(
        'File deletion failed! Please try again after some time',
      );
    }
  }
}

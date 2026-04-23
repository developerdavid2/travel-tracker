import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as path from 'path';

@Controller('file-upload')
@UseGuards(JwtAuthGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: path.join(__dirname, '..', '..', 'uploads'), // match main.ts
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.fileUploadService.uploadFile(file);
  }

  @Get()
  async getAllFiles() {
    const files = await this.fileUploadService.getAllFiles();

    return {
      success: true,
      data: files,
      message: 'Files retrieved successfully',
    };
  }

  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: string) {
    return this.fileUploadService.deleteFile(fileId);
  }
}

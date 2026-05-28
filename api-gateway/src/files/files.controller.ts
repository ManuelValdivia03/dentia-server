import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FilesService } from './files.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    return this.filesService.upload(file, req.body, this.getAuthHeader(req));
  }

  @Get()
  findAll(@Query() query: any, @Req() req: any) {
    return this.filesService.findAll(query, this.getAuthHeader(req));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.filesService.findOne(id, this.getAuthHeader(req));
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.filesService.download(id, this.getAuthHeader(req));

    const contentType = result.headers['content-type'];
    const contentDisposition = result.headers['content-disposition'];

    if (typeof contentType === 'string') {
      res.setHeader('Content-Type', contentType);
    }

    if (typeof contentDisposition === 'string') {
      res.setHeader('Content-Disposition', contentDisposition);
    }

    return new StreamableFile(result.stream);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.filesService.remove(id, this.getAuthHeader(req));
  }

  private getAuthHeader(req: any): string {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    return authHeader;
  }
}
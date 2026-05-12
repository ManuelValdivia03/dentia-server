import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { InternalAuthGuard } from './internal-auth.guard';
import { CurrentUserParam } from './current-user.decorator';
import { CurrentUser } from './current-user.interface';

@UseGuards(InternalAuthGuard)
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
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.filesService.upload(file, dto, user);
  }

  @Get()
  findAll(
    @Query() query: ListFilesQueryDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.filesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUserParam() user: CurrentUser) {
    return this.filesService.findOne(id, user);
  }

  @Get(':id/download')
  @Header('Content-Type', 'application/octet-stream')
  async download(
    @Param('id') id: string,
    @CurrentUserParam() user: CurrentUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.filesService.download(id, user);

    res.setHeader('Content-Type', result.file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.file.originalName)}"`,
    );

    return new StreamableFile(result.stream);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUserParam() user: CurrentUser) {
    return this.filesService.remove(id, user);
  }
}
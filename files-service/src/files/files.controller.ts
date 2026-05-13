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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { InternalAuthGuard } from './internal-auth.guard';
import { CurrentUserParam } from './current-user.decorator';
import { CurrentUser } from './current-user.interface';

@ApiTags('Files')
@ApiBearerAuth('JWT')
@UseGuards(InternalAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({ summary: 'Subir archivo clínico' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadFileDto })
  @ApiCreatedResponse({ description: 'Archivo subido correctamente.' })
  @ApiBadRequestResponse({ description: 'Archivo requerido o datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para subir este archivo.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
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
  @ApiOperation({ summary: 'Listar archivos clínicos según permisos del usuario' })
  @ApiQuery({
    name: 'patientId',
    required: false,
    example: 'p-123',
    description: 'Filtrar archivos por paciente.',
  })
  @ApiQuery({
    name: 'appointmentId',
    required: false,
    example: 'appointment-id',
    description: 'Filtrar archivos por cita.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    example: 'radiografia',
    description: 'Filtrar archivos por tipo clínico.',
  })
  @ApiOkResponse({ description: 'Listado de archivos clínicos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para consultar estos archivos.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  findAll(
    @Query() query: ListFilesQueryDto,
    @CurrentUserParam() user: CurrentUser,
  ) {
    return this.filesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar metadatos de un archivo clínico' })
  @ApiParam({
    name: 'id',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID del archivo clínico.',
  })
  @ApiOkResponse({ description: 'Metadatos del archivo clínico.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para consultar este archivo.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  findOne(@Param('id') id: string, @CurrentUserParam() user: CurrentUser) {
    return this.filesService.findOne(id, user);
  }

  @Get(':id/download')
  @Header('Content-Type', 'application/octet-stream')
  @ApiOperation({ summary: 'Descargar archivo clínico' })
  @ApiParam({
    name: 'id',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID del archivo clínico.',
  })
  @ApiOkResponse({ description: 'Archivo clínico descargado correctamente.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para descargar este archivo.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
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
  @ApiOperation({ summary: 'Eliminar archivo clínico' })
  @ApiParam({
    name: 'id',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID del archivo clínico.',
  })
  @ApiOkResponse({ description: 'Archivo eliminado correctamente.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para eliminar este archivo.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  remove(@Param('id') id: string, @CurrentUserParam() user: CurrentUser) {
    return this.filesService.remove(id, user);
  }
}
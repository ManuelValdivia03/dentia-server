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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
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
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.PATIENT)
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
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    return this.filesService.upload(file, req.body, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar archivos clínicos según filtros y permisos del usuario' })
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
  findAll(@Query() query: any, @Req() req: any) {
    return this.filesService.findAll(query, req.user);
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
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.filesService.findOne(id, req.user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar archivo clínico' })
  @ApiParam({
    name: 'id',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID del archivo clínico.',
  })
  @ApiOkResponse({ description: 'Stream del archivo clínico.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para descargar este archivo.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  async download(
    @Param('id') id: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.filesService.download(id, req.user);

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
  remove(@Param('id') id: string, @Req() req: any) {
    return this.filesService.remove(id, req.user);
  }
}
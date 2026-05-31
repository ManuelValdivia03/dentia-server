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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Subir archivo clínico' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir. Tamaño máximo: 10 MB.',
        },
        patientId: {
          type: 'string',
          example: 'patient_123',
          description: 'Paciente asociado al archivo.',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Archivo subido correctamente.' })
  @ApiBadRequestResponse({ description: 'Archivo requerido o datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Sin permiso para subir archivo.' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 10 MB.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }

    return this.filesService.upload(file, req.body, this.getAuthHeader(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar archivos clínicos' })
  @ApiQuery({ name: 'patientId', required: false, example: 'patient_123' })
  @ApiOkResponse({ description: 'Listado de archivos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Sin permiso para consultar archivos.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  findAll(@Query() query: any, @Req() req: any) {
    return this.filesService.findAll(query, this.getAuthHeader(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar metadatos de archivo por ID' })
  @ApiParam({ name: 'id', example: 'file_123' })
  @ApiOkResponse({ description: 'Detalle del archivo.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Sin permiso para consultar este archivo.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.filesService.findOne(id, this.getAuthHeader(req));
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar archivo clínico' })
  @ApiParam({ name: 'id', example: 'file_123' })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({ description: 'Archivo descargado correctamente.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Sin permiso para descargar este archivo.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
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
  @ApiOperation({ summary: 'Eliminar archivo clínico' })
  @ApiParam({ name: 'id', example: 'file_123' })
  @ApiOkResponse({ description: 'Archivo eliminado correctamente.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Sin permiso para eliminar este archivo.' })
  @ApiNotFoundResponse({ description: 'Archivo no encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'files-service no disponible.' })
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

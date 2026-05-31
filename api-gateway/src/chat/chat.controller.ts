import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Listar conversaciones del usuario autenticado' })
  @ApiOkResponse({ description: 'Listado de conversaciones.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Rol sin permisos suficientes.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  listConversations(@Req() req: any) {
    return this.chatService.listConversations(req.user);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Crear conversación paciente-dentista' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['patientId', 'dentistId'],
      properties: {
        patientId: { type: 'string', example: 'patient_123' },
        dentistId: { type: 'string', example: 'dentist_123' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Conversación creada correctamente.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'Sin permisos para crear la conversación.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  createConversation(@Body() body: any, @Req() req: any) {
    return this.chatService.createConversation(body, req.user);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Listar mensajes de una conversación' })
  @ApiParam({ name: 'conversationId', example: 'conversation_123' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'before', required: false, example: '2026-06-01T16:00:00.000Z' })
  @ApiOkResponse({ description: 'Listado de mensajes.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene acceso a esta conversación.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  listMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    return this.chatService.listMessages(conversationId, query, req.user);
  }

  @Post('conversations/:conversationId/messages')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  @ApiOperation({ summary: 'Enviar mensaje en una conversación' })
  @ApiParam({ name: 'conversationId', example: 'conversation_123' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
          example: 'Hola doctor, tengo una duda sobre mi receta.',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo adjunto opcional. Tamaño máximo: 50 MB.',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Mensaje enviado correctamente.' })
  @ApiBadRequestResponse({ description: 'Mensaje o archivo inválido.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene acceso a esta conversación.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service o files-service no disponible.' })
  sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      body,
      req.user,
      file,
      req.headers.authorization,
    );
  }

  @Patch('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Marcar conversación como leída' })
  @ApiParam({ name: 'conversationId', example: 'conversation_123' })
  @ApiOkResponse({ description: 'Conversación marcada como leída.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiForbiddenResponse({ description: 'No tiene acceso a esta conversación.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  markAsRead(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.chatService.markAsRead(conversationId, req.user);
  }
}

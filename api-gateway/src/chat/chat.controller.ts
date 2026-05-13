import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Listar conversaciones del usuario autenticado' })
  @ApiOkResponse({ description: 'Listado de conversaciones del paciente o dentista.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  listConversations(@Req() req: any) {
    return this.chatService.listConversations(req.user);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Crear conversación paciente-dentista' })
  @ApiBody({ type: CreateConversationDto })
  @ApiCreatedResponse({ description: 'Conversación creada correctamente.' })
  @ApiForbiddenResponse({
  description: 'No existe relación válida paciente-dentista o no tiene permiso.'})
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  createConversation(@Body() body: any, @Req() req: any) {
    return this.chatService.createConversation(body, req.user);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Listar mensajes de una conversación' })
  @ApiParam({
    name: 'conversationId',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID de la conversación.',
  })
  @ApiOkResponse({ description: 'Historial de mensajes.' })
  @ApiForbiddenResponse({ description: 'No tiene acceso a esta conversación.' })
  @ApiNotFoundResponse({ description: 'Conversación no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  listMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: any,
    @Req() req: any,
  ) {
    return this.chatService.listMessages(conversationId, query, req.user);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Enviar mensaje en una conversación' })
  @ApiParam({
    name: 'conversationId',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID de la conversación.',
  })

  @ApiBody({ type: SendMessageDto })
  @ApiCreatedResponse({ description: 'Mensaje enviado correctamente.' })
  @ApiForbiddenResponse({ description: 'No tiene permiso para enviar mensajes en esta conversación.' })
  @ApiNotFoundResponse({ description: 'Conversación no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(conversationId, body, req.user);
  }

  @Patch('conversations/:conversationId/read')
  @ApiOperation({ summary: 'Marcar conversación como leída' })
  @ApiParam({
    name: 'conversationId',
    example: '665f1b2c7a9e8a0012ab3456',
    description: 'ID de la conversación.',
  })
  @ApiOkResponse({ description: 'Conversación marcada como leída.' })
  @ApiForbiddenResponse({ description: 'No tiene acceso a esta conversación.' })
  @ApiNotFoundResponse({ description: 'Conversación no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'JWT ausente o inválido.' })
  @ApiServiceUnavailableResponse({ description: 'chat-service no disponible.' })
  markAsRead(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.chatService.markAsRead(conversationId, req.user);
  }
}
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { InternalAuthGuard } from './internal-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';

@UseGuards(InternalAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: CurrentUser) {
    return this.chatService.listConversations(user);
  }

  @Post('conversations')
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.chatService.createConversation(dto, user);
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.chatService.listMessages(
      conversationId,
      user,
      query.limit,
      query.before,
    );
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.chatService.sendMessage(conversationId, dto, user);
  }

  @Patch('conversations/:conversationId/read')
  markAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: CurrentUser,
  ) {
    return this.chatService.markAsRead(conversationId, user);
  }
}
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.PATIENT, UserRole.DENTIST)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  listConversations(@Req() req: any) {
    return this.chatService.listConversations(req.user);
  }

  @Post('conversations')
  createConversation(@Body() body: any, @Req() req: any) {
    return this.chatService.createConversation(body, req.user);
  }

  @Get('conversations/:conversationId/messages')
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
  markAsRead(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.chatService.markAsRead(conversationId, req.user);
  }
}
import { HttpException, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { FilesService } from '../files/files.service';

@Injectable()
export class ChatService {
  private readonly chatServiceUrl =
    process.env.CHAT_SERVICE_URL ?? 'http://localhost:3004';

  constructor(private readonly filesService: FilesService) {}

  async listConversations(user: any) {
    return this.forward(() =>
      axios.get(`${this.chatServiceUrl}/chat/conversations`, {
        headers: this.buildUserHeaders(user),
      }),
    );
  }

  async createConversation(body: any, user: any) {
    return this.forward(() =>
      axios.post(`${this.chatServiceUrl}/chat/conversations`, body, {
        headers: this.buildUserHeaders(user),
      }),
    );
  }

  async listMessages(conversationId: string, query: any, user: any) {
    return this.forward(() =>
      axios.get(
        `${this.chatServiceUrl}/chat/conversations/${conversationId}/messages`,
        {
          params: query,
          headers: this.buildUserHeaders(user),
        },
      ),
    );
  }

  async sendMessage(
    conversationId: string,
    body: any,
    user: any,
    file?: Express.Multer.File,
    authorization?: string,
  ) {
    const payload: any = {};

    if (body?.body) {
      payload.body = body.body;
    }

    // Reuse files-service to store the binary; the chat message only carries a reference.
    if (file) {
      if (!authorization) {
        throw new HttpException('Authorization header is required', 401);
      }

      const uploaded = await this.filesService.upload(file, body, authorization);

      payload.attachment = {
        fileId: uploaded.id,
        contentType: uploaded.contentType,
        originalName: uploaded.originalName,
        size: uploaded.size,
      };
    }

    return this.forward(() =>
      axios.post(
        `${this.chatServiceUrl}/chat/conversations/${conversationId}/messages`,
        payload,
        {
          headers: this.buildUserHeaders(user),
        },
      ),
    );
  }

  async markAsRead(conversationId: string, user: any) {
    return this.forward(() =>
      axios.patch(
        `${this.chatServiceUrl}/chat/conversations/${conversationId}/read`,
        {},
        {
          headers: this.buildUserHeaders(user),
        },
      ),
    );
  }

  private buildUserHeaders(user: any) {
    return {
      'x-user-id': user.domainId ?? user.sub ?? user.id,
      'x-user-role': user.role,
    };
  }

  private async forward(requestFn: () => Promise<any>) {
    try {
      const response = await requestFn();
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;

      if (axiosError.response) {
        throw new HttpException(
          axiosError.response.data,
          axiosError.response.status,
        );
      }

      throw new HttpException('Chat service unavailable', 503);
    }
  }
}
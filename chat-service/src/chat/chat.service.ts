import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from './current-user.decorator';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,

    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,

    private readonly config: ConfigService,
  ) {}

  async listConversations(user: CurrentUser) {
    const filter =
      user.role === 'PATIENT'
        ? { patientId: user.id }
        : user.role === 'DENTIST'
          ? { dentistId: user.id }
          : {};

    return this.conversationModel
      .find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();
  }

  async createConversation(dto: CreateConversationDto, user: CurrentUser) {
    this.assertCanOpenConversation(dto, user);

    await this.assertValidPatientDentistRelation(dto.patientId, dto.dentistId);

    const existing = await this.conversationModel.findOne({
      patientId: dto.patientId,
      dentistId: dto.dentistId,
    });

    if (existing) return existing;

    return this.conversationModel.create({
      patientId: dto.patientId,
      dentistId: dto.dentistId,
      isActive: true,
      lastReadAt: {},
    });
  }

  async listMessages(
    conversationId: string,
    user: CurrentUser,
    limit = 30,
    before?: string,
  ) {
    const conversation = await this.findConversationOrFail(conversationId);
    this.assertParticipant(conversation, user);

    const filter: any = {
      conversationId: new Types.ObjectId(conversationId),
      deleted: false,
    };

    if (before) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }

    return this.messageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    user: CurrentUser,
  ) {
    const conversation = await this.findConversationOrFail(conversationId);
    this.assertParticipant(conversation, user);

    if (!conversation.isActive) {
      throw new BadRequestException('Conversation is inactive');
    }

    if (user.role !== 'PATIENT' && user.role !== 'DENTIST') {
      throw new ForbiddenException('Only patient or dentist can send messages');
    }

    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: user.id,
      senderRole: user.role,
      body: dto.body.trim(),
    });

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      {
        lastMessagePreview: dto.body.trim().slice(0, 120),
        lastMessageAt: new Date(),
      },
    );

    return message;
  }

  async markAsRead(conversationId: string, user: CurrentUser) {
    const conversation = await this.findConversationOrFail(conversationId);
    this.assertParticipant(conversation, user);

    await this.conversationModel.updateOne(
      { _id: conversation._id },
      { $set: { [`lastReadAt.${user.id}`]: new Date() } },
    );

    return { ok: true };
  }

  private async findConversationOrFail(conversationId: string) {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new NotFoundException('Conversation not found');
    }

    const conversation = await this.conversationModel.findById(conversationId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  private assertParticipant(conversation: Conversation, user: CurrentUser) {
    if (user.role === 'ADMIN') return;

    const isPatient = user.role === 'PATIENT' && conversation.patientId === user.id;
    const isDentist = user.role === 'DENTIST' && conversation.dentistId === user.id;

    if (!isPatient && !isDentist) {
      throw new ForbiddenException('You cannot access this conversation');
    }
  }

  private assertCanOpenConversation(dto: CreateConversationDto, user: CurrentUser) {
    if (user.role === 'ADMIN') return;

    if (user.role === 'PATIENT' && dto.patientId !== user.id) {
      throw new ForbiddenException('Patient can only open own conversations');
    }

    if (user.role === 'DENTIST' && dto.dentistId !== user.id) {
      throw new ForbiddenException('Dentist can only open own conversations');
    }
  }

  private async assertValidPatientDentistRelation(patientId: string, dentistId: string) {
    const baseUrl = this.config.getOrThrow<string>('APPOINTMENTS_SERVICE_URL');
    const internalKey = this.config.getOrThrow<string>('INTERNAL_API_KEY');

    const response = await axios.get(
      `${baseUrl}/internal/relationships/patient-dentist`,
      {
        params: { patientId, dentistId },
        headers: { 'x-internal-api-key': internalKey },
      },
    );

    if (!response.data?.allowed) {
      throw new ForbiddenException('Patient and dentist do not have a valid relation');
    }
  }
}
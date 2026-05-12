import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ChatService } from './chat.service';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ChatService', () => {
  let service: ChatService;

  const conversationModelMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  };

  const messageModelMock = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        APPOINTMENTS_SERVICE_URL: 'http://appointments-service:3002',
        INTERNAL_API_KEY: 'dev-internal-key',
      };

      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(Conversation.name),
          useValue: conversationModelMock,
        },
        {
          provide: getModelToken(Message.name),
          useValue: messageModelMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list patient conversations', async () => {
    const conversations = [{ patientId: 'p1', dentistId: 'd1' }];

    conversationModelMock.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(conversations),
      }),
    });

    const result = await service.listConversations({
      id: 'p1',
      role: 'PATIENT',
    });

    expect(result).toEqual(conversations);
    expect(conversationModelMock.find).toHaveBeenCalledWith({ patientId: 'p1' });
  });

  it('should block patient creating conversation for another patient', async () => {
    await expect(
      service.createConversation(
        {
          patientId: 'p2',
          dentistId: 'd1',
        },
        {
          id: 'p1',
          role: 'PATIENT',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should block when patient-dentist relation is invalid', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        allowed: false,
      },
    });

    await expect(
      service.createConversation(
        {
          patientId: 'p1',
          dentistId: 'd1',
        },
        {
          id: 'p1',
          role: 'PATIENT',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should create conversation when relation is valid', async () => {
    const conversation = {
      patientId: 'p1',
      dentistId: 'd1',
      isActive: true,
    };

    mockedAxios.get.mockResolvedValue({
      data: {
        allowed: true,
      },
    });

    conversationModelMock.findOne.mockResolvedValue(null);
    conversationModelMock.create.mockResolvedValue(conversation);

    const result = await service.createConversation(
      {
        patientId: 'p1',
        dentistId: 'd1',
      },
      {
        id: 'p1',
        role: 'PATIENT',
      },
    );

    expect(result).toEqual(conversation);
    expect(conversationModelMock.create).toHaveBeenCalledWith({
      patientId: 'p1',
      dentistId: 'd1',
      isActive: true,
      lastReadAt: {},
    });
  });

  it('should send message when user is participant', async () => {
    const conversation = {
      _id: '507f1f77bcf86cd799439011',
      patientId: 'p1',
      dentistId: 'd1',
      isActive: true,
    };

    const message = {
      body: 'Hola',
      senderId: 'p1',
    };

    conversationModelMock.findById.mockResolvedValue(conversation);
    messageModelMock.create.mockResolvedValue(message);
    conversationModelMock.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const result = await service.sendMessage(
      '507f1f77bcf86cd799439011',
      {
        body: 'Hola',
      },
      {
        id: 'p1',
        role: 'PATIENT',
      },
    );

    expect(result).toEqual(message);
    expect(messageModelMock.create).toHaveBeenCalled();
    expect(conversationModelMock.updateOne).toHaveBeenCalled();
  });

  it('should block non participant reading messages', async () => {
    const conversation = {
      _id: '507f1f77bcf86cd799439011',
      patientId: 'p1',
      dentistId: 'd1',
      isActive: true,
    };

    conversationModelMock.findById.mockResolvedValue(conversation);

    await expect(
      service.listMessages(
        '507f1f77bcf86cd799439011',
        {
          id: 'p2',
          role: 'PATIENT',
        },
        30,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;

  const chatServiceMock = {
    listConversations: jest.fn(),
    createConversation: jest.fn(),
    listMessages: jest.fn(),
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: chatServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list conversations', async () => {
    const user = { id: 'p1', role: 'PATIENT' as const };
    chatServiceMock.listConversations.mockResolvedValue([]);

    await expect(controller.listConversations(user)).resolves.toEqual([]);
    expect(chatServiceMock.listConversations).toHaveBeenCalledWith(user);
  });

  it('should send message', async () => {
    const user = { id: 'p1', role: 'PATIENT' as const };
    const dto = { body: 'Hola' };
    const response = { body: 'Hola' };

    chatServiceMock.sendMessage.mockResolvedValue(response);

    await expect(
      controller.sendMessage('conversation-id', dto, user),
    ).resolves.toEqual(response);

    expect(chatServiceMock.sendMessage).toHaveBeenCalledWith(
      'conversation-id',
      dto,
      user,
    );
  });
});
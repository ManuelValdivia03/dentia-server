/// <reference types="jest" />

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('ChatController', () => {
  let controller: ChatController;
  let service: jest.Mocked<ChatService>;

  const authorization = 'Bearer test-token';

  const patientUser: any = {
    sub: 'u-patient',
    role: UserRole.PATIENT,
    domainId: 'p1',
    email: 'patient1@dentia.local',
  };

  const dentistUser: any = {
    sub: 'u-dentist',
    role: UserRole.DENTIST,
    domainId: 'd1',
    email: 'dentist1@dentia.local',
  };

  beforeEach(() => {
    service = {
      listConversations: jest.fn(),
      createConversation: jest.fn(),
      listMessages: jest.fn(),
      sendMessage: jest.fn(),
      markAsRead: jest.fn(),
    } as any;

    controller = new ChatController(service);
  });

  it('listConversations debe delegar user autenticado', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    const conversations = [
      {
        id: 'c1',
        patientId: 'p1',
        dentistId: 'd1',
      },
    ];

    service.listConversations.mockResolvedValueOnce(conversations as any);

    const result = await controller.listConversations(req);

    expect(service.listConversations).toHaveBeenCalledWith(patientUser);
    expect(result).toEqual(conversations);
  });

  it('createConversation debe delegar body y user autenticado', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    const body = {
      patientId: 'p1',
      dentistId: 'd1',
    };

    const conversation = {
      id: 'c1',
      ...body,
      isActive: true,
    };

    service.createConversation.mockResolvedValueOnce(conversation as any);

    const result = await controller.createConversation(body, req);

    expect(service.createConversation).toHaveBeenCalledWith(body, patientUser);
    expect(result).toEqual(conversation);
  });

  it('listMessages debe delegar conversationId, query y user autenticado', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    const query = {
      limit: '20',
      before: 'message-10',
    };

    const messages = [
      {
        id: 'm1',
        conversationId: 'c1',
        body: 'Hola',
      },
    ];

    service.listMessages.mockResolvedValueOnce(messages as any);

    const result = await controller.listMessages('c1', query, req);

    expect(service.listMessages).toHaveBeenCalledWith('c1', query, patientUser);
    expect(result).toEqual(messages);
  });

  it('sendMessage debe delegar body, user, archivo y Authorization header', async () => {
    const req: any = {
      headers: { authorization },
      user: dentistUser,
    };

    const body = {
      body: 'Hola, revisa el archivo adjunto',
    };

    const file = {
      originalname: 'radiografia.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    const message = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'd1',
      body: body.body,
    };

    service.sendMessage.mockResolvedValueOnce(message as any);

    const result = await controller.sendMessage('c1', body, req, file);

    expect(service.sendMessage).toHaveBeenCalledWith(
      'c1',
      body,
      dentistUser,
      file,
      authorization,
    );

    expect(result).toEqual(message);
  });

  it('sendMessage debe permitir mensaje sin archivo adjunto', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    const body = {
      body: 'Solo texto',
    };

    const message = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'p1',
      body: 'Solo texto',
    };

    service.sendMessage.mockResolvedValueOnce(message as any);

    const result = await controller.sendMessage('c1', body, req);

    expect(service.sendMessage).toHaveBeenCalledWith(
      'c1',
      body,
      patientUser,
      undefined,
      authorization,
    );

    expect(result).toEqual(message);
  });

  it('markAsRead debe delegar conversationId y user autenticado', async () => {
    const req: any = {
      headers: { authorization },
      user: patientUser,
    };

    service.markAsRead.mockResolvedValueOnce({ ok: true } as any);

    const result = await controller.markAsRead('c1', req);

    expect(service.markAsRead).toHaveBeenCalledWith('c1', patientUser);
    expect(result).toEqual({ ok: true });
  });
});
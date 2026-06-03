import axios from 'axios';
import { ChatService } from './chat.service';

jest.mock('axios');

describe('ChatService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  const filesService = {
    upload: jest.fn(),
  };

  const user = {
    domainId: 'd1',
    role: 'DENTIST',
  };

  const file = {
    originalname: 'radiografia.png',
    mimetype: 'image/png',
    size: 1234,
    buffer: Buffer.from('image'),
  } as Express.Multer.File;

  let service: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChatService(filesService as any);
  });

  it('adds the conversation patient id before uploading chat attachments', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [
        {
          id: 'conversation1',
          patientId: 'p1',
          dentistId: 'd1',
        },
      ],
    });
    filesService.upload.mockResolvedValue({
      id: 'file1',
      contentType: 'image/png',
      originalName: 'radiografia.png',
      size: 1234,
    });
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        id: 'message1',
      },
    });

    const result = await service.sendMessage(
      'conversation1',
      { body: 'Adjunto radiografia' },
      user,
      file,
      'Bearer token',
    );

    expect(filesService.upload).toHaveBeenCalledWith(
      file,
      {
        body: 'Adjunto radiografia',
        patientId: 'p1',
      },
      'Bearer token',
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:3004/chat/conversations/conversation1/messages',
      {
        body: 'Adjunto radiografia',
        attachment: {
          fileId: 'file1',
          contentType: 'image/png',
          originalName: 'radiografia.png',
          size: 1234,
        },
      },
      {
        headers: {
          'x-user-id': 'd1',
          'x-user-role': 'DENTIST',
        },
      },
    );
    expect(result).toEqual({
      id: 'message1',
    });
  });
});

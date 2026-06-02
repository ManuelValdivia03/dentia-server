import { BadRequestException } from '@nestjs/common';
import { FilesController } from './files.controller';

describe('FilesController', () => {
  let controller: FilesController;

  const filesServiceMock = {
    upload: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    download: jest.fn(),
    remove: jest.fn(),
  };

  const req = {
    headers: {
      authorization: 'Bearer test-token',
    },
    user: {
      sub: 'uuid-user',
      domainId: 'p1',
      role: 'PATIENT',
      email: 'patient1@dentia.local',
    },
    body: {
      appointmentId: 'appt1',
    },
  };

  const file = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('fake-pdf'),
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FilesController(filesServiceMock as any);
  });

  it('delegates upload to FilesService', async () => {
    filesServiceMock.upload.mockResolvedValue({
      id: 'file1',
      originalName: 'test.pdf',
    });

    const result = await controller.upload(file, req);

    expect(filesServiceMock.upload).toHaveBeenCalledWith(
      file,
      req.body,
      req.headers.authorization,
    );

    expect(result).toEqual({
      id: 'file1',
      originalName: 'test.pdf',
    });
  });

  it('rejects upload without file', () => {
    expect(() => controller.upload(undefined as any, req)).toThrow(
      BadRequestException,
    );

    expect(filesServiceMock.upload).not.toHaveBeenCalled();
  });

  it('delegates findAll to FilesService', async () => {
    const query = { appointmentId: 'appt1' };
    filesServiceMock.findAll.mockResolvedValue([]);

    const result = await controller.findAll(query, req);

    expect(filesServiceMock.findAll).toHaveBeenCalledWith(
      query,
      req.headers.authorization,
    );
    expect(result).toEqual([]);
  });

  it('delegates findOne to FilesService', async () => {
    filesServiceMock.findOne.mockResolvedValue({
      id: 'file1',
    });

    const result = await controller.findOne('file1', req);

    expect(filesServiceMock.findOne).toHaveBeenCalledWith(
      'file1',
      req.headers.authorization,
    );
    expect(result).toEqual({
      id: 'file1',
    });
  });

  it('delegates remove to FilesService', async () => {
    filesServiceMock.remove.mockResolvedValue({
      deleted: true,
      id: 'file1',
    });

    const result = await controller.remove('file1', req);

    expect(filesServiceMock.remove).toHaveBeenCalledWith(
      'file1',
      req.headers.authorization,
    );
    expect(result).toEqual({
      deleted: true,
      id: 'file1',
    });
  });
});

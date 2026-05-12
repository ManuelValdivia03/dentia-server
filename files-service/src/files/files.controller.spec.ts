import { StreamableFile } from '@nestjs/common';
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

  const user = {
    id: 'p1',
    role: 'PATIENT' as const,
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

  it('delegates upload to service', async () => {
    const dto = { appointmentId: 'appt1' };

    filesServiceMock.upload.mockResolvedValue({
      id: 'file1',
      originalName: 'test.pdf',
    });

    const result = await controller.upload(file, dto, user);

    expect(filesServiceMock.upload).toHaveBeenCalledWith(file, dto, user);
    expect(result).toEqual({
      id: 'file1',
      originalName: 'test.pdf',
    });
  });

  it('delegates findAll to service', async () => {
    const query = { appointmentId: 'appt1' };

    filesServiceMock.findAll.mockResolvedValue([]);

    const result = await controller.findAll(query, user);

    expect(filesServiceMock.findAll).toHaveBeenCalledWith(query, user);
    expect(result).toEqual([]);
  });

  it('delegates findOne to service', async () => {
    filesServiceMock.findOne.mockResolvedValue({
      id: 'file1',
    });

    const result = await controller.findOne('file1', user);

    expect(filesServiceMock.findOne).toHaveBeenCalledWith('file1', user);
    expect(result).toEqual({
      id: 'file1',
    });
  });

  it('delegates download and sets response headers', async () => {
    const setHeader = jest.fn();

    filesServiceMock.download.mockResolvedValue({
      file: {
        mimeType: 'application/pdf',
        originalName: 'test.pdf',
      },
      stream: Buffer.from('fake-pdf'),
    });

    const result = await controller.download('file1', user, {
      setHeader,
    } as any);

    expect(filesServiceMock.download).toHaveBeenCalledWith('file1', user);

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="test.pdf"',
    );

    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('delegates remove to service', async () => {
    filesServiceMock.remove.mockResolvedValue({
      deleted: true,
      id: 'file1',
    });

    const result = await controller.remove('file1', user);

    expect(filesServiceMock.remove).toHaveBeenCalledWith('file1', user);
    expect(result).toEqual({
      deleted: true,
      id: 'file1',
    });
  });
});
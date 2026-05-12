import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FilesService } from './files.service';

describe('FilesService', () => {
  let service: FilesService;

  const storageMock = {
    save: jest.fn(),
    createReadStream: jest.fn(),
    delete: jest.fn(),
  };

  const clinicalFileModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const patientUser = {
    id: 'p1',
    role: 'PATIENT' as const,
  };

  const dentistUser = {
    id: 'd1',
    role: 'DENTIST' as const,
  };

  const adminUser = {
    id: 'admin1',
    role: 'ADMIN' as const,
  };

  const validPdfFile = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('fake-pdf'),
  } as Express.Multer.File;

  const mockClinicalFile = {
    id: 'file1',
    originalName: 'test.pdf',
    storedName: 'stored.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    storagePath: '/app/uploads/stored.pdf',
    patientId: 'p1',
    appointmentId: 'appt1',
    prescriptionId: undefined,
    uploadedBy: 'p1',
    uploadedByRole: 'PATIENT',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.MAX_FILE_SIZE_MB = '10';

    storageMock.save.mockResolvedValue({
      storedName: 'stored.pdf',
      storagePath: '/app/uploads/stored.pdf',
    });

    storageMock.createReadStream.mockReturnValue('stream');

    clinicalFileModelMock.create.mockResolvedValue(mockClinicalFile);

    service = new FilesService(
      clinicalFileModelMock as any,
      storageMock as any,
    );
  });

  it('uploads a file as patient and forces patientId from user', async () => {
    const result = await service.upload(
      validPdfFile,
      {
        patientId: 'otro-paciente',
        appointmentId: 'appt1',
      },
      patientUser,
    );

    expect(storageMock.save).toHaveBeenCalledWith(validPdfFile);

    expect(clinicalFileModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        patientId: 'p1',
        appointmentId: 'appt1',
        uploadedBy: 'p1',
        uploadedByRole: 'PATIENT',
        deletedAt: null,
      }),
    );

    expect(result).toMatchObject({
      id: 'file1',
      originalName: 'test.pdf',
      patientId: 'p1',
      uploadedBy: 'p1',
    });
  });

  it('requires patientId when admin uploads a file', async () => {
    await expect(
      service.upload(validPdfFile, {}, adminUser),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported file types', async () => {
    const txtFile = {
      ...validPdfFile,
      originalname: 'test.txt',
      mimetype: 'text/plain',
    } as Express.Multer.File;

    await expect(
      service.upload(txtFile, {}, patientUser),
    ).rejects.toThrow(BadRequestException);

    expect(storageMock.save).not.toHaveBeenCalled();
    expect(clinicalFileModelMock.create).not.toHaveBeenCalled();
  });

  it('filters patient files by authenticated patient id', async () => {
    const exec = jest.fn().mockResolvedValue([mockClinicalFile]);
    const sort = jest.fn().mockReturnValue({ exec });

    clinicalFileModelMock.find.mockReturnValue({ sort });

    const result = await service.findAll({}, patientUser);

    expect(clinicalFileModelMock.find).toHaveBeenCalledWith({
      deletedAt: null,
      patientId: 'p1',
    });

    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(1);
  });

  it('filters dentist files by uploadedBy', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ exec });

    clinicalFileModelMock.find.mockReturnValue({ sort });

    await service.findAll({ patientId: 'p1' }, dentistUser);

    expect(clinicalFileModelMock.find).toHaveBeenCalledWith({
      deletedAt: null,
      uploadedBy: 'd1',
      patientId: 'p1',
    });
  });

  it('allows patient to access own file', async () => {
    clinicalFileModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockClinicalFile),
    });

    const result = await service.findOne('file1', patientUser);

    expect(result).toMatchObject({
      id: 'file1',
      patientId: 'p1',
    });
  });

  it('blocks patient from accessing another patient file', async () => {
    clinicalFileModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockClinicalFile,
        patientId: 'p2',
      }),
    });

    await expect(service.findOne('file1', patientUser)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('soft deletes file when requester uploaded it', async () => {
    const save = jest.fn();

    clinicalFileModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockClinicalFile,
        save,
      }),
    });

    const result = await service.remove('file1', patientUser);

    expect(storageMock.delete).toHaveBeenCalledWith('/app/uploads/stored.pdf');
    expect(save).toHaveBeenCalled();
    expect(result).toEqual({
      deleted: true,
      id: 'file1',
    });
  });

  it('blocks delete when requester is not owner or admin', async () => {
    clinicalFileModelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockClinicalFile,
        uploadedBy: 'otro-user',
      }),
    });

    await expect(service.remove('file1', patientUser)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
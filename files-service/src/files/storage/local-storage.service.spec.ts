import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let uploadDir: string;
  let service: LocalStorageService;

  const file = {
    originalname: 'clinical-file.pdf',
    buffer: Buffer.from('fake-pdf-content'),
  } as Express.Multer.File;

  beforeEach(async () => {
    uploadDir = join(
      tmpdir(),
      `dentia-files-test-${Date.now()}-${Math.random()}`,
    );

    process.env.FILES_UPLOAD_DIR = uploadDir;
    service = new LocalStorageService();
  });

  afterEach(async () => {
    await fs.rm(uploadDir, {
      recursive: true,
      force: true,
    });

    delete process.env.FILES_UPLOAD_DIR;
  });

  it('saves a file in local storage', async () => {
    const result = await service.save(file);

    expect(result.storedName).toMatch(/\.pdf$/);
    expect(result.storagePath).toContain(uploadDir);
    expect(existsSync(result.storagePath)).toBe(true);

    const savedContent = await fs.readFile(result.storagePath);
    expect(savedContent.toString()).toBe('fake-pdf-content');
  });

  it('creates a readable stream for a stored file', async () => {
    const saved = await service.save(file);

    const stream = service.createReadStream(saved.storagePath);

    expect(stream).toBeDefined();

    stream.destroy();
  });

  it('deletes a stored file', async () => {
    const saved = await service.save(file);

    expect(existsSync(saved.storagePath)).toBe(true);

    await service.delete(saved.storagePath);

    expect(existsSync(saved.storagePath)).toBe(false);
  });

  it('does not fail when deleting a missing file', async () => {
    await expect(
      service.delete(join(uploadDir, 'missing-file.pdf')),
    ).resolves.toBeUndefined();
  });
});
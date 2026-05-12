import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { extname, join } from 'path';

@Injectable()
export class LocalStorageService {
  private readonly uploadDir =
    process.env.FILES_UPLOAD_DIR ?? join(process.cwd(), 'uploads');

  async save(file: Express.Multer.File) {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });

      const extension = extname(file.originalname).toLowerCase();
      const storedName = `${randomUUID()}${extension}`;
      const storagePath = join(this.uploadDir, storedName);

      await fs.writeFile(storagePath, file.buffer);

      return {
        storedName,
        storagePath,
      };
    } catch {
      throw new InternalServerErrorException('No se pudo guardar el archivo');
    }
  }

  createReadStream(storagePath: string) {
    return createReadStream(storagePath);
  }

  async delete(storagePath: string) {
    try {
      await fs.unlink(storagePath);
    } catch {
      // No bloqueamos el soft delete si el binario ya no existe.
    }
  }
}
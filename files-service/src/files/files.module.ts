import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import {
  ClinicalFile,
  ClinicalFileSchema,
} from './schemas/clinical-file.schema';
import { LocalStorageService } from './storage/local-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ClinicalFile.name,
        schema: ClinicalFileSchema,
      },
    ]),
  ],
  controllers: [FilesController],
  providers: [FilesService, LocalStorageService],
})
export class FilesModule {}
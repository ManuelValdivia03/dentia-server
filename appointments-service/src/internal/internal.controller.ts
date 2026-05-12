import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalService } from './internal.service';
import { InternalApiKeyGuard } from './internal-api-key.guard';

@UseGuards(InternalApiKeyGuard)
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('relationships/patient-dentist')
  checkPatientDentistRelation(
    @Query('patientId') patientId: string,
    @Query('dentistId') dentistId: string,
  ) {
    if (!patientId || !dentistId) {
      throw new BadRequestException('patientId and dentistId are required');
    }

    return this.internalService.hasPatientDentistRelation(patientId, dentistId);
  }
}
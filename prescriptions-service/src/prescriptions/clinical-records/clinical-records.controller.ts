import { Controller, HttpException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ClinicalRecordsService } from './clinical-records.service';
import { RequestUser } from '../interfaces/request-user.interface';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto';
import { CreateClinicalEncounterDto } from './dto/create-clinical-encounter.dto';

@Controller()
export class ClinicalRecordsController {
  constructor(
    private readonly clinicalRecordsService: ClinicalRecordsService,
  ) {}

  @MessagePattern({ cmd: 'clinicalRecords.findByPatient' })
  async findByPatient(
    @Payload()
    payload: {
      patientId: string;
      requester: RequestUser;
      dentistId?: string;
      authHeader?: string;
    },
  ) {
    try {
      return await this.clinicalRecordsService.getPatientRecord(
        payload.patientId,
        payload.requester,
        payload.dentistId,
        payload.authHeader,
      );
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'clinicalRecords.updatePatientRecord' })
  async updatePatientRecord(
    @Payload()
    payload: {
      patientId: string;
      dto: UpdateClinicalRecordDto;
      requester: RequestUser;
      authHeader?: string;
    },
  ) {
    try {
      return await this.clinicalRecordsService.updatePatientRecord(
        payload.patientId,
        payload.dto,
        payload.requester,
        payload.authHeader,
      );
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern({ cmd: 'clinicalRecords.createEncounter' })
  async createEncounter(
    @Payload()
    payload: {
      patientId: string;
      dto: CreateClinicalEncounterDto;
      requester: RequestUser;
      authHeader?: string;
    },
  ) {
    try {
      return await this.clinicalRecordsService.createEncounter(
        payload.patientId,
        payload.dto,
        payload.requester,
        payload.authHeader,
      );
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  private toRpcException(error: unknown): RpcException {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      const message =
        typeof response === 'object' &&
        response !== null &&
        'message' in response
          ? (response as { message: string | string[] }).message
          : error.message;

      return new RpcException({
        statusCode: error.getStatus(),
        message,
      });
    }

    return new RpcException({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
import { HttpException, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';

@Injectable()
export class FilesService {
  private readonly filesServiceUrl =
    process.env.FILES_SERVICE_URL ?? 'http://localhost:3005';

  async upload(file: Express.Multer.File, body: any, user: any) {
    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    if (body.patientId) {
      form.append('patientId', body.patientId);
    }

    if (body.appointmentId) {
      form.append('appointmentId', body.appointmentId);
    }

    if (body.prescriptionId) {
      form.append('prescriptionId', body.prescriptionId);
    }

    return this.forward(() =>
      axios.post(`${this.filesServiceUrl}/files`, form, {
        headers: {
          ...form.getHeaders(),
          ...this.buildUserHeaders(user),
        },
        maxBodyLength: Infinity,
      }),
    );
  }

  async findAll(query: any, user: any) {
    return this.forward(() =>
      axios.get(`${this.filesServiceUrl}/files`, {
        params: query,
        headers: this.buildUserHeaders(user),
      }),
    );
  }

  async findOne(id: string, user: any) {
    return this.forward(() =>
      axios.get(`${this.filesServiceUrl}/files/${id}`, {
        headers: this.buildUserHeaders(user),
      }),
    );
  }

  async download(id: string, user: any) {
    try {
      const response = await axios.get(`${this.filesServiceUrl}/files/${id}/download`, {
        headers: this.buildUserHeaders(user),
        responseType: 'stream',
      });

      return {
        stream: response.data,
        headers: response.headers,
      };
    } catch (error) {
      this.throwForwardedError(error, 'Files service unavailable');
    }
  }

  async remove(id: string, user: any) {
    return this.forward(() =>
      axios.delete(`${this.filesServiceUrl}/files/${id}`, {
        headers: this.buildUserHeaders(user),
      }),
    );
  }

  private buildUserHeaders(user: any) {
    return {
      'x-user-id': user.domainId ?? user.sub ?? user.id,
      'x-user-role': user.role,
      'x-internal-api-key': process.env.INTERNAL_API_KEY ?? 'dev-internal-key',
    };
  }

  private async forward(requestFn: () => Promise<any>) {
    try {
      const response = await requestFn();
      return response.data;
    } catch (error) {
      this.throwForwardedError(error, 'Files service unavailable');
    }
  }

  private throwForwardedError(error: unknown, fallbackMessage: string): never {
    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      throw new HttpException(
        axiosError.response.data,
        axiosError.response.status,
      );
    }

    throw new HttpException(fallbackMessage, 503);
  }
}
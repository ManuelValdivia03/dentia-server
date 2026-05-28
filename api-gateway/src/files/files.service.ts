import { HttpException, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import FormData from 'form-data';

@Injectable()
export class FilesService {
  private readonly filesServiceUrl =
    process.env.FILES_SERVICE_URL ?? 'http://localhost:3005';

  async upload(file: Express.Multer.File, body: any, authorization: string) {
    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    });

    if (body.patientId) {
      form.append('patientId', body.patientId);
    }

    return this.forward(() =>
      axios.post(`${this.filesServiceUrl}/api/files/upload`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: authorization,
        },
        maxBodyLength: Infinity,
      }),
    );
  }

  async findAll(query: any, authorization: string) {
    return this.forward(() =>
      axios.get(`${this.filesServiceUrl}/api/files`, {
        params: query,
        headers: {
          Authorization: authorization,
        },
      }),
    );
  }

  async findOne(id: string, authorization: string) {
    return this.forward(() =>
      axios.get(`${this.filesServiceUrl}/api/files/${id}`, {
        headers: {
          Authorization: authorization,
        },
      }),
    );
  }

  async download(id: string, authorization: string) {
    try {
      const response = await axios.get(
        `${this.filesServiceUrl}/api/files/${id}/download`,
        {
          headers: {
            Authorization: authorization,
          },
          responseType: 'stream',
        },
      );

      return {
        stream: response.data,
        headers: response.headers,
      };
    } catch (error) {
      this.throwForwardedError(error, 'Files service unavailable');
    }
  }

  async remove(id: string, authorization: string) {
    return this.forward(() =>
      axios.delete(`${this.filesServiceUrl}/api/files/${id}`, {
        headers: {
          Authorization: authorization,
        },
      }),
    );
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
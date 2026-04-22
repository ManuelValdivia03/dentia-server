import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const tcpHost = process.env.PRESCRIPTIONS_TCP_HOST ?? '0.0.0.0';
  const tcpPort = Number(process.env.PRESCRIPTIONS_TCP_PORT ?? 4002);
  const httpPort = Number(process.env.PORT ?? 3003);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: tcpHost,
      port: tcpPort,
    },
  });

  await app.startAllMicroservices();
  await app.listen(httpPort);
}
bootstrap();
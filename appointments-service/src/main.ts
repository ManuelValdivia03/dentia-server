import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: config.get<string>('APPOINTMENTS_TCP_HOST', '0.0.0.0'),
        port: config.get<number>('APPOINTMENTS_TCP_PORT', 4001),
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();

  const port = config.get<number>('PORT', 3002);
  await app.listen(port);
}

bootstrap().catch((error) => {
  console.error('appointments-service bootstrap failed:', error);
  process.exit(1);
});
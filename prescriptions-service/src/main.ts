import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const tcpHost = process.env.PRESCRIPTIONS_TCP_HOST ?? '0.0.0.0';
  const tcpPort = Number(process.env.PRESCRIPTIONS_TCP_PORT ?? 4002);
  const httpPort = Number(process.env.PORT ?? 3003);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: tcpHost,
        port: tcpPort,
      },
    },
    { inheritAppConfig: true },
  );

  const swaggerConfig = new DocumentBuilder()
  .setTitle('Dentia Prescriptions Service')
  .setDescription('REST API para recetas, diagnósticos, notas clínicas y generación de PDF.')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.startAllMicroservices();
  await app.listen(httpPort);
}

bootstrap();
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Dentia API Gateway')
    .setDescription(
      'API Gateway REST de Dentia. Centraliza autenticación, citas, chat, archivos, recetas y comunicación con microservicios.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT obtenido desde /auth/login',
      },
      'JWT',
    )
    .addTag('Auth', 'Registro, login y sesión')
    .addTag('Dentists', 'Consulta de dentistas afiliados')
    .addTag('Appointments', 'Gestión de citas odontológicas')
    .addTag('Chat', 'Comunicación paciente-dentista')
    .addTag('Files', 'Archivos clínicos')
    .addTag('Prescriptions', 'Recetas e indicaciones')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
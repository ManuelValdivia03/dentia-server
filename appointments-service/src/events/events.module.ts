import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventsPublisher } from './events.publisher';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBITMQ_URL ||
              'amqp://dentia:dentia123@rabbitmq:5672',
          ],
          queue:
            process.env.RABBITMQ_QUEUE_APPOINTMENTS ||
            'appointments_events',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  providers: [EventsPublisher],
  exports: [EventsPublisher],
})
export class EventsModule {}
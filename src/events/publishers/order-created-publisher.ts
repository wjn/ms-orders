import {
  Publisher,
  OrderCreatedEvent,
  Topics,
} from '@nielsendigital/ms-common';

export class OrderCreatedPublisher extends Publisher<OrderCreatedEvent> {
  readonly topic = Topics.OrderCreated;
}

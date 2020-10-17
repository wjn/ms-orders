import {
  Publisher,
  OrderCanceledEvent,
  Topics,
} from '@nielsendigital/ms-common';

// Canceled can be spelled with one "L" or two. We will use a
// single "L" as convention for this app.
export class OrderCanceledPublisher extends Publisher<OrderCanceledEvent> {
  readonly topic = Topics.OrderCanceled;
}

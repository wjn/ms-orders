import {
  Listener,
  Topics,
  PaymentCreatedEvent,
  queueGroupNames,
  OrderStatus,
  NotFoundError,
} from '@nielsendigital/ms-common';
import { Message } from 'node-nats-streaming';
import { Order } from '../../models/order';

export class PaymentCeatedListener extends Listener<PaymentCreatedEvent> {
  readonly topic = Topics.PaymentCreated;

  queueGroupName = queueGroupNames.ORDERS_SERVICE;

  async onMessage(data: PaymentCreatedEvent['data'], msg: Message) {
    const order = await Order.findById(data.orderId);

    if (!order) {
      throw new NotFoundError('Order not found when updating payment');
    }

    order.set({
      status: OrderStatus.Complete,
    });
    await order.save();

    msg.ack();
  }
}

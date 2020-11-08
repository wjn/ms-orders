import {
  Listener,
  Topics,
  ExpirationCompleteEvent,
  queueGroupNames,
  NotFoundError,
  logIt,
  OrderStatus,
  natsWrapper,
  LogType,
} from '@nielsendigital/ms-common';
import { Message } from 'node-nats-streaming';
import { Order } from '../../models/order';
import { OrderCanceledPublisher } from '../publishers/order-canceled-publisher';

export class ExpirationCompleteListener extends Listener<ExpirationCompleteEvent> {
  readonly queueGroupName = queueGroupNames.ORDERS_SERVICE;
  readonly topic = Topics.ExpirationComplete;

  async onMessage(data: ExpirationCompleteEvent['data'], msg: Message) {
    logIt.out(
      LogType.STARTED,
      `ExpirationCompleteListener for OrderId ${data.orderId} on Topic ${this.topic} in the ${this.queueGroupName} queueGroup`
    );
    const order = await Order.findById(data.orderId).populate('ticket');

    if (!order) {
      throw new NotFoundError('Order not found.');
    }

    // if the order has been paid for (orderStatus.Complete), insure that
    // it cannot be cancelled by returning early and acking the message
    if (order.status === OrderStatus.Complete) {
      return msg.ack();
    }

    order.set({ status: OrderStatus.CanceledExpired });

    await order.save();

    // I required all the properties all the time. Stephen didn't. I'm not sure
    // how to handle expiresAt and order.status here.
    await new OrderCanceledPublisher(this.client).publish({
      id: order.id,
      version: order.version,
      userId: order.userId,
      status: OrderStatus.CanceledExpired,
      expiresAt: order.expiresAt.toString(),
      ticket: {
        id: order.ticket.id,
        title: order.ticket.title,
        userId: order.ticket.userId,
        price: order.ticket.price,
        version: order.ticket.version,
      },
    });

    msg.ack();
  }
}

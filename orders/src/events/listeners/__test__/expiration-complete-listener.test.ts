import { natsWrapper, OrderStatus, ExpirationCompleteEvent, OrderData } from '@nielsendigital/ms-common';
import { Message } from 'node-nats-streaming';
import { ExpirationCompleteListener } from '../expiration-complete-listener';
import { Order } from '../../../models/order';
import { Ticket } from '../../../models/ticket';

const setup = async () => {
  const listener = new ExpirationCompleteListener(natsWrapper.client);

  const ticket = Ticket.build({
    id: global.ticketIdGenerated,
    title: global.ticketTitleValid,
    price: global.ticketPriceValid,
  });

  await ticket.save();

  const order = Order.build({
    status: OrderStatus.Created,
    userId: global.userIdValid,
    expiresAt: new Date(),
    ticket,
  });

  await order.save();

  const data: ExpirationCompleteEvent['data'] = {
    orderId: order.id,
  };

  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, ticket, order, data, msg };
};

it('should update order status to canceled', async () => {
  const { listener, order, data, msg } = await setup();

  await listener.onMessage(data, msg);

  const updatedOrder = await Order.findById(order.id);
  expect(updatedOrder!.status).toEqual(OrderStatus.CanceledExpired);
});

it('should emit an OrderCanceled Event', async () => {
  const { listener, order, data, msg } = await setup();

  await listener.onMessage(data, msg);

  expect(natsWrapper.client.publish).toHaveBeenCalledTimes(1);

  /**
   * ...calls[0] is the first time publish was called
   * ...calls[0][0] is the topic proprty on the Event
   * ...calls[0][1] is the data property on the data property on the event:
   *
   * interface ExpirationCompleteEvent {
   *    topic: Topics.ExpirationComplete;
   *    data: {  <---
   *            orderId: string;
   *          }
   *  };
   *
   */
  const eventData = JSON.parse((natsWrapper.client.publish as jest.Mock).mock.calls[0][1]);

  expect(eventData.id).toEqual(order.id);
});

it('should ack the message', async () => {
  const { listener, data, msg } = await setup();

  await listener.onMessage(data, msg);

  expect(msg.ack).toHaveBeenCalledTimes(1);
});

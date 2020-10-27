import { Message } from 'node-nats-streaming';
import {
  queueGroupNames,
  Topics,
  Listener,
  TicketUpdatedEvent,
  TicketData,
  NotFoundError,
} from '@nielsendigital/ms-common';
import { Ticket } from '../../models/ticket';

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  readonly topic = Topics.TicketUpdated;
  queueGroupName = queueGroupNames.ORDERS_SERVICE;

  async onMessage(data: TicketData, msg: Message) {
    const ticket = await Ticket.findByIdAndPreviousVersion(data);

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // update title and price for ticket then save
    const { title, price, version } = data;
    ticket.set({ title, price, version });
    await ticket.save();

    msg.ack();
  }
}

import { Message } from 'node-nats-streaming';
import {
  Topics,
  Listener,
  TicketUpdatedEvent,
  TicketData,
  NotFoundError,
} from '@nielsendigital/ms-common';
import { queueGroupNames } from '../enums/queue-group-names';
import { Ticket } from '../../models/ticket';

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  readonly topic = Topics.TicketUpdated;
  queueGroupName = queueGroupNames.ORDERS_SERVICE;

  async onMessage(data: TicketData, msg: Message) {
    const { title, price } = data;
    const ticket = await Ticket.findById(data.id);

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    ticket.set({ title, price });
    await ticket.save();

    msg.ack();
  }
}

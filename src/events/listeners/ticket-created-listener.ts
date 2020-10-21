import { Message } from 'node-nats-streaming';
import {
  Topics,
  Listener,
  TicketCreatedEvent,
  TicketData,
} from '@nielsendigital/ms-common';
import { queueGroupNames } from '../enums/queue-group-names';
import { Ticket } from '../../models/ticket';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly topic = Topics.TicketCreated;

  // NATS uses queueGroups to distribute requests to all
  // memember instances of the queueGroup
  queueGroupName = queueGroupNames.ORDERS_SERVICE;

  // data is of type referencing the data prop of
  // the TicketCreatedEvent interface
  async onMessage(data: TicketData, msg: Message) {
    const { id, title, price } = data;

    const ticket = Ticket.build({
      id,
      title,
      price,
    });
    await ticket.save();

    msg.ack();
  }
}

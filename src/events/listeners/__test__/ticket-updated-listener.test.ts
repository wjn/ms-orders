import { natsWrapper, TicketData } from '@nielsendigital/ms-common';
import { TicketUpdatedListener } from '../ticket-updated-listener';
import { Ticket } from '../../../models/ticket';
import { Message } from 'node-nats-streaming';

const setup = async () => {
  // create listener
  const listener = new TicketUpdatedListener(natsWrapper.client);

  // create fake ticket
  const ticket = Ticket.build({
    id: global.ticketIdGenerated,
    title: global.ticketTitleValid,
    price: global.ticketPriceValid,
  });

  await ticket.save();

  // create fake data object
  const data: TicketData = {
    id: ticket.id,
    version: ticket.version + 1,
    title: global.ticketTitleValidUpdated,
    price: global.ticketPriceValidUpdated,
    userId: 'adsafghkjlkj',
  };

  // create a fake msg object
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  // return all the things
  return { msg, data, ticket, listener };
};

it('should find, update, and save a ticket', async () => {
  const { msg, data, ticket, listener } = await setup();

  await listener.onMessage(data, msg);

  const updatedTicket = await Ticket.findById(ticket.id);

  expect(updatedTicket!.title).toEqual(data.title);
  expect(updatedTicket!.price).toEqual(data.price);
  expect(updatedTicket!.version).toEqual(data.version);
});
it('should ack the message', async () => {
  const { msg, data, listener } = await setup();

  await listener.onMessage(data, msg);

  expect(msg.ack).toHaveBeenCalledTimes(1);
});

it('should not call ack() out-of-order versions', async () => {
  const { msg, data, ticket, listener } = await setup();

  // set version to way in the future
  data.version = 10;

  try {
    await listener.onMessage(data, msg);
  } catch (err) {
    // catching ticket not found error
  }

  expect(msg.ack).not.toHaveBeenCalled();
});

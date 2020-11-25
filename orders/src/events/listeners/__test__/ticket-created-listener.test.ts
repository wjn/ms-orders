import { Message } from 'node-nats-streaming';
import { TicketCreatedListener } from '../ticket-created-listener';
import { natsWrapper, TicketData } from '@nielsendigital/ms-common';
import { Ticket } from '../../../models/ticket';

const setup = async () => {
  // create instance of listener
  const listener = new TicketCreatedListener(natsWrapper.client);

  // create fake data event
  const data: TicketData = {
    userId: global.userIdValid,
    version: 0,
    id: global.ticketIdGenerated,
    title: global.ticketTitleValid,
    price: global.ticketPriceValid,
  };

  // create a fake message object which contains the ack() function
  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg };
};

it('should create and save a ticket', async () => {
  const { listener, data, msg } = await setup();

  // call onMessage with data and message object
  await listener.onMessage(data, msg);

  // write assertions to make sure ticket was created
  const ticket = await Ticket.findById(data.id);

  expect(ticket).toBeDefined();
  expect(ticket!.title).toEqual(data.title);
  expect(ticket!.price).toEqual(data.price);
});

it('should ack the message', async () => {
  const { data, listener, msg } = await setup();

  // call onMessage with data and message object
  await listener.onMessage(data, msg);

  // write assertions to make sure ack() is called
  expect(msg.ack).toHaveBeenCalledTimes(1);
});

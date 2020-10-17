import request from 'supertest';
import { app } from '../../app';
import { Order, OrderStatus } from '../../models/order';
import { Ticket } from '../../models/ticket';

it('should fetch orders for a given user', async () => {
  // create 3 tickets using ticket Model
  const tickets = {
    1: await global.buildTicket(),
    2: await global.buildTicket(),
    3: await global.buildTicket(),
  };

  const user1 = global.getAuthCookie();
  const user2 = global.getAuthCookie();

  // create 1 order as user#1
  await global
    .createEntity('/api/orders', { ticketId: tickets[1].id }, user1)
    .expect(201);

  // create 2 orders as user#2
  const { body: order1 } = await global
    .createEntity('/api/orders', { ticketId: tickets[2].id }, user2)
    .expect(201);

  const { body: order2 } = await global
    .createEntity('/api/orders', { ticketId: tickets[3].id }, user2)
    .expect(201);

  // fetch orders for user#2
  const response = await request(app)
    .get('/api/orders')
    .set('Cookie', user2)
    .expect(200);

  // make sure only user#2's orders are returned
  // make sure only 2 orders come back (user2 owns 2 orders)
  expect(response.body.length).toEqual(2);

  expect(response.body[0].id).toEqual(order1.id);
  expect(response.body[0].ticket.id).toEqual(tickets[2].id);
  expect(response.body[1].id).toEqual(order2.id);
  expect(response.body[1].ticket.id).toEqual(tickets[3].id);
});

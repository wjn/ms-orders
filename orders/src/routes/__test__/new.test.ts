import request from 'supertest';
import { app } from '../../app';
import { natsWrapper } from '@nielsendigital/ms-common';
import { Order, OrderStatus } from '../../models/order';

it('should have a route handler listening to /api/tickets for POST requests', async () => {
  const response = await request(app).post('/api/orders').send({});
  expect(response).not.toEqual(404);
});

it('should throw a 401 (NotAuthorized) error if user is NOT authenticated', async () => {
  await request(app).post('/api/orders').send({}).expect(401);
});

it('should return a 400 BadRequest error if order body is empty', async () => {
  const response = await request(app).post('/api/orders').set('Cookie', global.getAuthCookie()).send({});

  expect(response.status).toEqual(400);
});

it('should return 404 NotFound error if ticket does not exist', async () => {
  await request(app)
    .post('/api/orders')
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: global.ticketIdGenerated })
    .expect(404);
});

/**
 * Ticket.isReserved()
 *
 * To be reserved, a ticket must be associated with an order which
 * has a status that is anything but 'canceled'. We use the isReserved()
 * function on the Ticket Model to determine this. isReserved() is
 * invoked in the routes/new.ts file.
 */
it('should return error if ticket is already reserved', async () => {
  const ticket = await global.buildTicket();

  const order = Order.build({
    ticket,
    userId: global.orderUserIdValid,
    status: OrderStatus.Created,
    expiresAt: new Date(),
  });

  await order.save();

  await request(app)
    .post('/api/orders')
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: ticket.id })
    .expect(400);
});

it('should reserve a ticket as a successful order', async () => {
  const ticket = await global.buildTicket();

  const order = await request(app)
    .post('/api/orders')
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: ticket.id })
    .expect(201);

  // check response sent back has correct status and ticketId
  expect(order.body.status).toEqual(OrderStatus.Created);
  expect(order.body.ticket.id).toEqual(ticket.id);

  const orderDb = await Order.findById(order.body.id).exec();

  // validate that the created order in the db has the ticketId we created.
  expect(orderDb?.ticket.toString()).toEqual(ticket.id);
});

it('should publish an event on successful order', async () => {
  const ticket = await global.buildTicket();
  await request(app)
    .post('/api/orders')
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: ticket.id })
    .expect(201);

  expect(natsWrapper.client.publish).toHaveBeenCalledTimes(1);
});

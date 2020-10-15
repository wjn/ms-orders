import request from 'supertest';
import { app } from '../../app';
import { Ticket } from '../../models/ticket';
import { Order, OrderStatus } from '../../models/order';
import { natsWrapper } from '../../nats-wrapper';

it('should have a route handler listening to /api/tickets for POST requests', async () => {
  const response = await request(app).post('/api/orders').send({});
  expect(response).not.toEqual(404);
});

it('should throw a 401 (NotAuthorized) error if user is NOT authenticated', async () => {
  await request(app).post('/api/orders').send({}).expect(401);
});

it('should return a 400 BadRequest error if order body is empty', async () => {
  const response = await request(app)
    .post('/api/orders')
    .set('Cookie', global.getAuthCookie())
    .send({});

  expect(response.status).toEqual(400);
});

it('should return 404 NotFound error if ticket does not exist', async () => {
  await request(app)
    .post('/api/orders')
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: global.ticketIdGenerated })
    .expect(404);
});

// TODO: Data and response validation
// it('should return an error if invalid userId is provided', async () => {})
// it('should return an error if invalid orderStatus is provided', async () => {})
// it('should return a 404 error if valid order is not found', async () => {});

/**
 * Ticket.isReserved()
 *
 * To be reserved, a ticket must be associated with an order which
 * has a status that is anything but 'canceled'. We use the isReserved()
 * function on the Ticket Model to determine this. isReserved() is
 * invoked in the routes/new.ts file.
 */
it('should return error if ticket is already reserved', async () => {
  const ticket = Ticket.build({
    title: global.ticketTitleValid,
    price: global.ticketPriceValid,
  });

  // save the ticket to Mongo
  await ticket.save();

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
  const ticket = Ticket.build({
    title: global.ticketTitleValid,
    price: global.ticketPriceValid,
  });

  // save the ticket to Mongo
  await ticket.save();

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

// TODO:
it.todo('should publish an event on successful order');

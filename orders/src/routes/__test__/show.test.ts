import request from 'supertest';
import { app } from '../../app';

it('should fetch an order by orderId', async () => {
  // create ticket
  const ticket = await global.buildTicket();

  const user = global.getAuthCookie();
  // make a request to build an order with the above ticket

  const { body: order } = await request(app)
    .post('/api/orders')
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  // make a request to fetch the order
  const { body: fetchedOrder } = await request(app)
    .get(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(200);

  expect(fetchedOrder.id).toEqual(order.id);
});

it('should forbid fetching order if user does not own it', async () => {
  // create ticket
  const ticket = await global.buildTicket();

  const user = global.getAuthCookie();
  // make a request to build an order with the above ticket

  const { body: order } = await request(app)
    .post('/api/orders')
    // order as a different user
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: ticket.id })
    .expect(201);

  // make a request to fetch the order
  await request(app)
    .get(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(401);
});

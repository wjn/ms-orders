import request from 'supertest';
import { app } from '../../app';

it('should save order version when order is created', async () => {
  const ticket = await global.buildTicket();
  const user = global.getAuthCookie();

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
  expect(fetchedOrder.version).toEqual(0);
});

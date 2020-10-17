import { logIt, LogType, natsWrapper } from '@nielsendigital/ms-common';
import request from 'supertest';
import { app } from '../../app';
import { OrderStatus } from '../../models/order';

it('should give a 404 when the order does not exist', async () => {
  const ticket = await global.buildTicket();
  await request(app)
    .post('/api/orders')
    // order as a different user
    .set('Cookie', global.getAuthCookie())
    .send({ ticketId: global.ticketIdGenerated })
    .expect(404);
});

it('should give a 401 when user does not own the order', async () => {
  // create ticket with Ticket Model
  const ticket = await global.buildTicket();
  const user = global.getAuthCookie();

  // make a request to create an order
  const { body: order } = await request(app)
    .post('/api/orders')
    // order as a different user
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  // validate the order is canceled
  const fetchedOrder = await request(app)
    .get(`/api/orders/${order.id}`)
    // different userId
    .set('Cookie', global.getAuthCookie())
    .send()
    .expect(401);
});

it('should give a 400 (Bad Request) when the orderId is invalid', async () => {
  await request(app)
    .get(`/api/orders/${global.orderIdInvalid}`)
    .set('Cookie', global.getAuthCookie())
    .send()
    .expect(400);
});

it('should give a 204 when the order is canceled', async () => {
  // create ticket with Ticket Model
  const ticket = await global.buildTicket();
  const user = global.getAuthCookie();

  logIt.out(LogType.INFO, 'Working inside delete.test.ts');
  logIt.out(LogType.INFO, ticket);

  // make a request to create an order
  const { body: order } = await request(app)
    .post('/api/orders')
    // order as a different user
    .set('Cookie', user)
    .send({ ticketId: ticket.id })
    .expect(201);

  // creating the order will call the natsWrapper...publish() function
  expect(natsWrapper.client.publish).toHaveBeenCalledTimes(1);

  logIt.out(LogType.NOTICE, `ticket ${ticket.id} created`);

  // make a request to cancel the order
  logIt.out(LogType.NOTICE, `requesting to delete order : ${order.id}`);

  await request(app)
    .delete(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(204);

  // deleting an order calls the natsWrapper...publish() function a second time
  expect(natsWrapper.client.publish).toHaveBeenCalledTimes(2);

  // validate the order is canceled by fetching through the `show` route
  const fetchedOrder = await request(app)
    .get(`/api/orders/${order.id}`)
    .set('Cookie', user)
    .send()
    .expect(200);

  expect(fetchedOrder.body.status).toEqual(OrderStatus.CanceledByUser);
});

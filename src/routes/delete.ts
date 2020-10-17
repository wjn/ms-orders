import express, { Request, Response } from 'express';
import { Order, OrderStatus } from '../models/order';
import {
  BadRequestError,
  logIt,
  LogType,
  NotAuthorizedError,
  NotFoundError,
  requireAuth,
} from '@nielsendigital/ms-common';
import { OrderCanceledPublisher } from '../events/publishers/order-canceled-publisher';
import { natsWrapper } from '../nats-wrapper';

const router = express.Router();

router.delete(
  '/api/orders/:orderId',
  requireAuth,
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    // Look up the order by id
    const order = await Order.findById(orderId).populate('ticket');

    // If the query was error free but didn't find an order then
    // throw a Not Found Error 404
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // If an order was found but the order owner is not the
    // currentUser, then throw a Not Authorized Error 401
    if (order.userId !== req.currentUser!.id) {
      logIt.out(LogType.INFO, `order.userId: ${order.userId}`);
      logIt.out(LogType.INFO, `req.currentUser!.id: ${req.currentUser!.id}`);
      throw new NotAuthorizedError('Not authorized to delete this order');
    }

    // Otherwise update the order status to Canceled By User and save
    order.status = OrderStatus.CanceledByUser;
    await order.save();

    // publish order:canceledbyuser event
    new OrderCanceledPublisher(natsWrapper.client).publish({
      id: order.id,
      status: order.status,
      userId: order.userId,
      // get a UTC timestamp from expiresAt Date Object.
      expiresAt: order.expiresAt.toISOString(),
      ticket: {
        id: order.ticket.id,
        title: order.ticket.title,
        price: order.ticket.price,
        userId: order.userId,
      },
    });

    logIt.out(
      LogType.INFO,
      `preparing to send 204 for successful delete of order ${order.id}`
    );
    // return the updated order
    res.status(204).send(order);
  }
);

export { router as deleteOrderRouter };

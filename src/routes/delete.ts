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

const router = express.Router();

router.delete(
  '/api/orders/:orderId',
  requireAuth,
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    try {
      // Look up the order by id
      const order = await Order.findById(orderId);

      // If the query was error free but didn't find an order then
      // throw a Not Found Error
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      // If an order was found but the order owner is not the
      // currentUser, then throw a Not Authorized Error
      if (order.userId !== req.currentUser!.id) {
        console.log(`order.userId: ${order.userId}`);
        console.log(`req.currentUser!.id: ${req.currentUser!.id}`);
        throw new NotAuthorizedError();
      }

      // Otherwise update the order status to Canceled By User and save
      order.status = OrderStatus.CanceledByUser;
      await order.save();

      // publish order:canceledbyuser event

      // return the updated order
      res.status(204).send(order);
    } catch (err) {
      // throw bad request if the DB rejects the query (e.g., invalid UserId)
      throw new BadRequestError('There was a problem with your order query');
    }
  }
);

export { router as deleteOrderRouter };

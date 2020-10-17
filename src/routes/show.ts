import express, { Request, Response } from 'express';
import {
  NotAuthorizedError,
  NotFoundError,
  requireAuth,
} from '@nielsendigital/ms-common';
import { Order } from '../models/order';

const router = express.Router();

router.get('/api/orders/:orderId', async (req: Request, res: Response) => {
  // TODO: validate that the :orderId supplied is a mongo ObjectID

  const order = await Order.findById(req.params.orderId).populate('ticket');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  if (order.userId !== req.currentUser!.id) {
    throw new NotAuthorizedError('This is not your order');
  }

  res.send(order);
});

export { router as showOrderRouter };

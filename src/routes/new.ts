import mongoose from 'mongoose';
import express, { Request, Response } from 'express';
import {
  OrderStatus,
  NotFoundError,
  requireAuth,
  validateRequest,
  BadRequestError,
} from '@nielsendigital/ms-common';
import { body } from 'express-validator';
import { Ticket } from '../models/ticket';
import { Order } from '../models/order';

const router = express.Router();

const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post(
  '/api/orders',
  requireAuth, // << currentUser is guaranteed to be defined.
  [
    body('ticketId')
      .not()
      .isEmpty()
      // validate that the id is a Mongo ID << does couple a bit with ticketing
      .custom((input: string) => {
        mongoose.Types.ObjectId.isValid(input);
      })
      .withMessage('TicketId must be provided'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body;

    // 1. find ticket user wants to order in the DB or return error
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      throw new NotFoundError('Ticket ID not found');
    }

    // 2. insure that ticket isn't already reserved
    if (await ticket.isReserved()) {
      throw new BadRequestError('Ticket is already reserved');
    }

    // 3. calculate an expiration date for the order
    const expirationDate = new Date();
    expirationDate.setSeconds(
      expirationDate.getSeconds() + EXPIRATION_WINDOW_SECONDS
    );

    // 4. build the order and save to the database
    // 4.a. Build up the order in mongo
    const order = Order.build({
      userId: req.currentUser!.id,
      status: OrderStatus.Created,
      expiresAt: expirationDate,
      ticket: ticket,
    });

    // 4.b. save to database.
    await order.save();

    // 5. publish order:created event
    res.status(201).send(order);
  }
);

export { router as newOrderRouter };

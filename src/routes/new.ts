import mongoose from 'mongoose';
import express, { Request, Response } from 'express';
import {
  OrderStatus,
  NotFoundError,
  requireAuth,
  validateRequest,
  BadRequestError,
  logIt,
  LogType,
} from '@nielsendigital/ms-common';
import { body } from 'express-validator';
import { Ticket } from '../models/ticket';
import { Order } from '../models/order';
import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher';
import { natsWrapper } from '../nats-wrapper';

const router = express.Router();

// TODO: use the process.env.EXPIRATION_WINDOW_SECONDS k8s env var instead
const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post(
  '/api/orders',

  // Notes about requireAuth
  // * currentUser is guaranteed to be defined if passes auth.
  // * If auth fails a 401 NotAuthorized error is thrown
  requireAuth,
  [
    body('ticketId')
      .not()
      .isEmpty()
      // validate that the id is a Mongo ID << does couple a bit with ticketing
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage('TicketId must be provided'),
  ],
  // RequestValidationErrors return 400 BadRequest
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body;

    // 1. find ticket user wants to order in the DB or return error
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      // 404
      logIt.out(LogType.WARNING, `Ticket ${ticketId} was not found.`);
      throw new NotFoundError('Ticket ID not found');
    }

    logIt.out(LogType.SUCCESS, `Ticket ${ticketId} was found.`);

    // 2. insure that ticket isn't already reserved
    const isReserved = await ticket.isReserved();

    if (isReserved) {
      // 400
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
    try {
      new OrderCreatedPublisher(natsWrapper.client).publish({
        id: order.id,
        status: order.status,
        userId: order.userId,
        // get a UTC timestamp from expiresAt Date Object.
        expiresAt: order.expiresAt.toISOString(),
        ticket: {
          id: ticket.id,
          title: ticket.title,
          price: ticket.price,
          userId: order.userId,
        },
      });
    } catch (err) {
      logIt.out(LogType.FAIL, err);
      throw new BadRequestError('Event could not be published to NATS');
    }

    res.status(201).send(order);
  }
);

export { router as newOrderRouter };

import mongoose from 'mongoose';
import express, { Request, Response } from 'express';
import { requireAuth, validateRequest } from '@nielsendigital/ms-common';
import { body } from 'express-validator';

const router = express.Router();

router.post(
  '/api/orders',
  requireAuth,
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
  async (req: Request, res: Response) => {
    res.send({});
  }
);

export { router as newOrderRouter };

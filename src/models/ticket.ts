import { logIt, LogType } from '@nielsendigital/ms-common';
import mongoose from 'mongoose';
import { Order, OrderStatus } from './order';

interface TicketAttrs {
  title: string;
  price: number;
}

export interface TicketDoc extends mongoose.Document {
  title: string;
  price: number;
  isReserved(): Promise<boolean>;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
}

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket(attrs);
};

/**
 * To be reserved, a ticket must be associated with an order which
 * has a status that is anything but 'canceled'.
 * We'll need to search all orders to answer this question. If we do
 * find an order, it means that the ticket *IS* reserved.
 */

ticketSchema.methods.isReserved = async function (): Promise<boolean> {
  const existingOrder = await Order.findOne({
    ticket: this,
    status: {
      $in: [
        OrderStatus.Created,
        OrderStatus.AwaitingPayment,
        OrderStatus.Complete,
      ],
    },
  });

  /** Use of the Double Bang (!!).
   *  -------------------------------------------------------------------
   *  if an order is found existingOrder (eo) is truthy.
   *  !eo = false
   *  !!eo = true
   *
   *  if an order is NOT found eo is falsey
   *  !eo = true
   *  !!eo = false
   *
   *  so the use of the double bang (!!) essentially converts something
   *  from truthy/falsey to a straightup boolean of true/false.
   *  ------------------------------------------------------------------- */

  return !!existingOrder;
};

const Ticket = mongoose.model<TicketDoc, TicketModel>('Ticket', ticketSchema);

export { Ticket };

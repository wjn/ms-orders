import { updateIfCurrentPlugin } from 'mongoose-update-if-current';
import mongoose from 'mongoose';
import { Order, OrderStatus } from './order';

interface TicketAttrs {
  id?: string;
  title: string;
  price: number;
}

export interface TicketDoc extends mongoose.Document {
  title: string;
  price: number;
  version: number;
  isReserved(): Promise<boolean>;
}

export interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
  findByIdAndPreviousVersion(event: {
    id: string;
    version: number;
  }): Promise<TicketDoc | null>;
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

// sets version key to 'version' (default is '_v')
ticketSchema.set('versionKey', 'version');
ticketSchema.plugin(updateIfCurrentPlugin);

ticketSchema.statics.findByIdAndPreviousVersion = (event: {
  id: string;
  version: number;
}) => {
  return Ticket.findOne({
    _id: event.id,
    version: event.version - 1,
  });
};

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  const { id, title, price } = attrs;
  return new Ticket({
    _id: id,
    title,
    price,
  });
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

import mongoose from 'mongoose';
import { OrderStatus } from '@nielsendigital/ms-common';
import { TicketDoc } from './ticket';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

export { OrderStatus };
interface OrderAttrs {
  userId: string;
  status: OrderStatus;
  expiresAt: Date;
  ticket: TicketDoc;
}

interface OrderDoc extends mongoose.Document {
  userId: string;
  version: number;
  status: OrderStatus;
  expiresAt: Date;
  ticket: TicketDoc;
}

interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(OrderStatus),
      default: OrderStatus.Created,
    },
    expiresAt: {
      type: mongoose.Schema.Types.Date,
    },
    // It appears taht we can pass in a property called `ticketId`
    // with the Ticket.id to satisfy this with Mongo. I'm confused as
    // to why `ticketId` works as a property name.
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
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
orderSchema.set('versionKey', 'version');
orderSchema.plugin(updateIfCurrentPlugin);

// use the $where property to implement the updateIfCurrentPlugin functionality
// that enforces optimistic concurrency control by managing the version number
// when a record is saved.
// https://mongoosejs.com/docs/api/model.html#model_Model-$where
// orderSchema.pre('save', function (done) {
//   // @ts-ignore << $where is not included properly in the mongoose type definition
//   this.$where = {
//     version: this.get('version') - 1,
//   };

//   done();
// });

orderSchema.statics.build = (attrs: OrderAttrs) => {
  return new Order(attrs);
};

const Order = mongoose.model<OrderDoc, OrderModel>('Order', orderSchema);

export { Order };

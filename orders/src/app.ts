import express from 'express';
import 'express-async-errors';
import { json } from 'body-parser';
import cookieSession from 'cookie-session';

import {
  currentUser,
  errorHandler,
  NotFoundError,
} from '@nielsendigital/ms-common';

// Routers
import { deleteOrderRouter } from './routes/delete';
import { indexOrderRouter } from './routes/index';
import { newOrderRouter } from './routes/new';
import { showOrderRouter } from './routes/show';

const app = express();
// allows for ingress-nginx proxy
app.set('trust proxy', true);
app.use(json());
app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV !== 'test',
  })
);
// currentUser must be used after the CookieSession creates req.cookie
app.use(currentUser);

app.use(deleteOrderRouter);
app.use(indexOrderRouter);
app.use(newOrderRouter);
app.use(showOrderRouter);

app.all('*', async (req, res, next) => {
  throw new NotFoundError('Page not found.');
});

app.use(errorHandler);

export { app };

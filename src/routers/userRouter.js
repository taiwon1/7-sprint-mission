// src/routers/usersRouter.js
import express from 'express';
import * as usersController from '../controllers/usersController.js';
import {withAsync} from '../lib/withAsync.js';

const usersRouter = express.Router();

// POST /users/signup
usersRouter.post('/signup', withAsync(usersController.signUp));
usersRouter.post('/signin', withAsync(usersController.signIn));

export default usersRouter;
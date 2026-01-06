import express from 'express';
import * as usersController from '../controllers/usersController.js';
import { withAsync } from '../lib/withAsync.js';
// 💡 인증 미들웨어 임포트
import { authMiddleware } from '../lib/authMiddleware.js';

const usersRouter = express.Router();

// --- 🔓 공용 API (인증 불필요) ---
usersRouter.post('/signup', withAsync(usersController.signUp));
usersRouter.post('/signin', withAsync(usersController.signIn));

// --- 🔒 마이페이지 API (인증 필수) ---
// 아래 기능들은 유효한 JWT 토큰이 있어야만 접근 가능합니다.
usersRouter.get('/me', authMiddleware, withAsync(usersController.getMe));
usersRouter.patch('/me', authMiddleware, withAsync(usersController.updateMe));
usersRouter.patch('/me/password', authMiddleware, withAsync(usersController.changePassword));
usersRouter.get('/me/products', authMiddleware, withAsync(usersController.getMyProducts));

export default usersRouter;
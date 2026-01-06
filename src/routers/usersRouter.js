import express from 'express';
import * as usersController from '../controllers/usersController.js';
import { withAsync } from '../lib/withAsync.js';
import { authMiddleware } from '../lib/authMiddleware.js';

const usersRouter = express.Router();

// --- 🔓 공용 API (인증 불필요) ---
usersRouter.post('/signup', withAsync(usersController.signUp));
usersRouter.post('/signin', withAsync(usersController.signIn));
usersRouter.post('/refresh', withAsync(usersController.refresh));

// --- 🔒 마이페이지 API (인증 필수) ---
// 아래 기능들은 유효한 JWT 토큰이 있어야만 접근 가능합니다.
usersRouter.get('/me', authMiddleware, withAsync(usersController.getMe));
usersRouter.patch('/me', authMiddleware, withAsync(usersController.updateMe));
usersRouter.patch('/me/password', authMiddleware, withAsync(usersController.changePassword));

// 내가 등록한 상품 조회
usersRouter.get('/me/products', authMiddleware, withAsync(usersController.getMyProducts));

// 💡 내가 좋아요 누른 상품 조회 (추가된 부분)
usersRouter.get('/me/liked-products', authMiddleware, withAsync(usersController.getMyLikedProducts));

export default usersRouter;
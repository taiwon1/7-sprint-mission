import express from 'express';
import { authMiddleware } from '../lib/authMiddleware.js';
import { withAsync } from '../lib/withAsync.js';
import { toggleProductLike, getMyLikedProducts } from '../controllers/likesController.js';

const likesRouter = express.Router();

likesRouter.use(authMiddleware);

// 상품 좋아요 토글
likesRouter.post('/products/:productId', withAsync(toggleProductLike));
// 내가 좋아요 한 목록
likesRouter.get('/my/products', withAsync(getMyProducts));

export default likesRouter;
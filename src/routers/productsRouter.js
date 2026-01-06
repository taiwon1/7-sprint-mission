// src/routers/productsRouter.js
import express from 'express';
import { withAsync } from '../lib/withAsync.js';
import {
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductList,
  createComment,
  getCommentList,
  toggleProductLike
} from '../controllers/productsController.js';
import { authMiddleware } from '../lib/authMiddleware.js';

const productsRouter = express.Router();

// 상품 목록 조회 및 상세 조지는 인증이 필요 없음
productsRouter.get('/', withAsync(getProductList));
productsRouter.get('/:id', withAsync(getProduct));

// ✅ 수정: authMiddleware는 withAsync로 감싸지 않고 그대로 넣습니다.
productsRouter.post('/', authMiddleware, withAsync(createProduct));
productsRouter.post('/:id/like', authMiddleware, withAsync(toggleProductLike));

// ✅ 수정: 상품 수정 및 삭제도 마찬가지입니다.
productsRouter.patch('/:id', authMiddleware, withAsync(updateProduct));
productsRouter.delete('/:id', authMiddleware, withAsync(deleteProduct));

// ✅ 수정: 댓글 등록
productsRouter.post('/:id/comments', authMiddleware, withAsync(createComment));

productsRouter.get('/:id/comments', withAsync(getCommentList));

export default productsRouter;
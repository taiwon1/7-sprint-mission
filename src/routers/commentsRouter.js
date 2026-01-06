import express from 'express';
import { withAsync } from '../lib/withAsync.js';
import { updateComment, deleteComment } from '../controllers/commentsController.js';
// 1. 인증 미들웨어 임포트
import { authMiddleware } from '../lib/authMiddleware.js';

const commentsRouter = express.Router();

// 2. 수정 및 삭제 시 로그인 및 본인 확인이 필요하므로 authMiddleware 추가
commentsRouter.patch('/:id', authMiddleware, withAsync(updateComment));
commentsRouter.delete('/:id', authMiddleware, withAsync(deleteComment));

export default commentsRouter;
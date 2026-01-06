import express from 'express';
import { withAsync } from '../lib/withAsync.js';
import {
  createArticle,
  getArticleList,
  getArticle,
  updateArticle,
  deleteArticle,
  createComment,
  getCommentList,
  toggleArticleLike
} from '../controllers/articlesController.js';
// 1. 인증 미들웨어 임포트
import { authMiddleware } from '../lib/authMiddleware.js';

const articlesRouter = express.Router();

// 2. 게시글 등록: 로그인 필수
articlesRouter.post('/', authMiddleware, withAsync(createArticle));
articlesRouter.post('/:id/like', authMiddleware, withAsync(toggleArticleLike));

// 게시글 목록 및 상세 조회: 인증 필요 없음
articlesRouter.get('/', withAsync(getArticleList));
articlesRouter.get('/:id', withAsync(getArticle));

// 3. 게시글 수정 및 삭제: 로그인 필수 (컨트롤러에서 본인 확인 로직 필요)
articlesRouter.patch('/:id', authMiddleware, withAsync(updateArticle));
articlesRouter.delete('/:id', authMiddleware, withAsync(deleteArticle));

// 4. 댓글 등록: 로그인 필수
articlesRouter.post('/:id/comments', authMiddleware, withAsync(createComment));

// 댓글 목록 조회: 인증 필요 없음
articlesRouter.get('/:id/comments', withAsync(getCommentList));

export default articlesRouter;
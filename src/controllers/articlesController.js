import { create } from 'superstruct';
import { prismaClient } from '../lib/prismaClient.js';
import NotFoundError from '../lib/errors/NotFoundError.js';
import { IdParamsStruct } from '../structs/commonStructs.js';
import {
  CreateArticleBodyStruct,
  UpdateArticleBodyStruct,
  GetArticleListParamsStruct,
} from '../structs/articlesStructs.js';
import { CreateCommentBodyStruct, GetCommentListParamsStruct } from '../structs/commentsStruct.js';

export async function createArticle(req, res) {
  const data = create(req.body, CreateArticleBodyStruct);
  const userId = req.user.id;

  // 💡 Prisma 에러 해결: connect 구문을 사용하여 유저와 연결
  const article = await prismaClient.article.create({ 
    data: { 
      ...data, 
      user: {
        connect: { id: Number(userId) }
      }
    } 
  });

  return res.status(201).send(article);
}

export async function getArticle(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const userId = req.user?.id; // authMiddleware가 적용된 경우에만 존재

  const article = await prismaClient.article.findUnique({ 
    where: { id },
    include: {
      _count: {
        select: { likes: true } // 💡 전체 좋아요 개수 포함
      }
    }
  });

  if (!article) {
    throw new NotFoundError('article', id);
  }

  // 🛡️ 로그인 상태라면 본인이 좋아요를 눌렀는지 확인
  let isLiked = false;
  if (userId) {
    const like = await prismaClient.like.findFirst({
      where: {
        userId: Number(userId),
        articleId: id,
      },
    });
    isLiked = !!like;
  }

  // 기존 article 데이터에 좋아요 정보 합쳐서 반환
  return res.send({
    ...article,
    likeCount: article._count.likes,
    isLiked,
  });
}

// 2. 게시글 좋아요 토글 기능 추가
export async function toggleArticleLike(req, res) {
  const { id: articleId } = create(req.params, IdParamsStruct);
  const userId = req.user.id;

  // 게시글 존재 확인
  const article = await prismaClient.article.findUnique({ where: { id: articleId } });
  if (!article) throw new NotFoundError('article', articleId);

  // 좋아요 기록 확인 (복합 유니크 키 사용 시 findUnique 가능)
  const existingLike = await prismaClient.like.findFirst({
    where: {
      userId: Number(userId),
      articleId: articleId,
    },
  });

  if (existingLike) {
    // 이미 있다면 취소
    await prismaClient.like.delete({
      where: { id: existingLike.id },
    });
    return res.json({ isLiked: false });
  } else {
    // 없다면 좋아요 등록
    await prismaClient.like.create({
      data: {
        user: { connect: { id: Number(userId) } },
        article: { connect: { id: articleId } },
      },
    });
    return res.json({ isLiked: true });
  }
}

export async function updateArticle(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const data = create(req.body, UpdateArticleBodyStruct);
  const userId = req.user.id;

  const article = await prismaClient.article.findUnique({ where: { id } });
  if (!article) throw new NotFoundError('article', id);

  // 🛡️ 소유권 검증: BigInt와 Number 비교를 위해 Number() 처리
  if (Number(article.userId) !== Number(userId)) {
    return res.status(403).json({ message: "본인이 등록한 게시글만 수정할 수 있습니다." });
  }

  const updated = await prismaClient.article.update({ where: { id }, data });
  return res.send(updated);
}

export async function deleteArticle(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const userId = req.user.id;

  const existingArticle = await prismaClient.article.findUnique({ where: { id } });
  if (!existingArticle) throw new NotFoundError('article', id);

  // 🛡️ 소유권 검증
  if (Number(existingArticle.userId) !== Number(userId)) {
    return res.status(403).json({ message: "본인이 등록한 게시글만 삭제할 수 있습니다." });
  }

  await prismaClient.article.delete({ where: { id } });
  return res.status(204).send();
}

export async function getArticleList(req, res) {
  const { page, pageSize, orderBy, keyword } = create(req.query, GetArticleListParamsStruct);

  const where = {
    title: keyword ? { contains: keyword } : undefined,
  };

  const totalCount = await prismaClient.article.count({ where });
  const articles = await prismaClient.article.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: orderBy === 'recent' ? { createdAt: 'desc' } : { id: 'asc' },
    where,
  });

  return res.send({
    list: articles,
    totalCount,
  });
}

export async function createComment(req, res) {
  const { id: articleId } = create(req.params, IdParamsStruct);
  const { content } = create(req.body, CreateCommentBodyStruct);
  const userId = req.user.id; // 💡 댓글 작성자 정보 추가

  const existingArticle = await prismaClient.article.findUnique({ where: { id: articleId } });
  if (!existingArticle) {
    throw new NotFoundError('article', articleId);
  }

  const comment = await prismaClient.comment.create({
    data: {
      content,
      // 💡 게시글과 유저 모두 connect로 연결
      article: { connect: { id: articleId } },
      user: { connect: { id: Number(userId) } }
    },
  });

  return res.status(201).send(comment);
}

export async function getCommentList(req, res) {
  const { id: articleId } = create(req.params, IdParamsStruct);
  const { cursor, limit } = create(req.query, GetCommentListParamsStruct);

  const article = await prismaClient.article.findUnique({ where: { id: articleId } });
  if (!article) {
    throw new NotFoundError('article', articleId);
  }

  const commentsWithCursor = await prismaClient.comment.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    where: { articleId },
    orderBy: { createdAt: 'desc' },
  });
  const comments = commentsWithCursor.slice(0, limit);
  const cursorComment = commentsWithCursor[commentsWithCursor.length - 1];
  const nextCursor = cursorComment ? cursorComment.id : null;

  return res.send({
    list: comments,
    nextCursor,
  });
}
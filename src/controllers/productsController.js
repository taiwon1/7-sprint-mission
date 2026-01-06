import { create } from 'superstruct';
import { prismaClient } from '../lib/prismaClient.js';
import NotFoundError from '../lib/errors/NotFoundError.js';
import { BadRequestError } from '../lib/errors/BadRequestError.js'; // 추가
import { IdParamsStruct } from '../structs/commonStructs.js';
import {
  CreateProductBodyStruct,
  GetProductListParamsStruct,
  UpdateProductBodyStruct,
} from '../structs/productsStruct.js';
import { CreateCommentBodyStruct, GetCommentListParamsStruct } from '../structs/commentsStruct.js';

export async function createProduct(req, res) {
  const { name, description, price, tags, images } = create(req.body, CreateProductBodyStruct);
  
  // 1. 로그인한 유저의 ID를 userId(작성자)로 함께 저장
  const userId = req.user.id; 

  const product = await prismaClient.product.create({
    data: { name, description, price, tags, images, userId },
  });

  res.status(201).send(product);
}

export async function getProduct(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const userId = req.user?.id; // authMiddleware를 거쳤다면 존재함

  const product = await prismaClient.product.findUnique({ 
    where: { id },
    include: {
      _count: {
        select: { likes: true } // 💡 상품에 달린 총 좋아요 수 카운트
      }
    }
  });

  if (!product) {
    throw new NotFoundError('product', id);
  }

  // 🛡️ 로그인 상태라면 본인이 좋아요를 눌렀는지 확인
  let isLiked = false;
  if (userId) {
    const like = await prismaClient.like.findFirst({
      where: {
        userId: Number(userId),
        productId: id,
      },
    });
    isLiked = !!like;
  }

  return res.send({
    ...product,
    likeCount: product._count.likes,
    isLiked,
  });
}

// 2. 상품 좋아요 토글 기능 (toggleProductLike 추가)
export async function toggleProductLike(req, res) {
  const { id: productId } = create(req.params, IdParamsStruct);
  const userId = req.user.id;

  const product = await prismaClient.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError('product', productId);

  // 기존 좋아요 기록 확인
  const existingLike = await prismaClient.like.findFirst({
    where: {
      userId: Number(userId),
      productId: productId,
    },
  });

  if (existingLike) {
    // ❌ 이미 있다면 좋아요 취소
    await prismaClient.like.delete({
      where: { id: existingLike.id },
    });
    return res.json({ isLiked: false });
  } else {
    // ❤️ 없다면 좋아요 등록
    await prismaClient.like.create({
      data: {
        user: { connect: { id: Number(userId) } },
        product: { connect: { id: productId } },
      },
    });
    return res.json({ isLiked: true });
  }
}

export async function updateProduct(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const { name, description, price, tags, images } = create(req.body, UpdateProductBodyStruct);

  const existingProduct = await prismaClient.product.findUnique({ where: { id } });
  if (!existingProduct) {
    throw new NotFoundError('product', id);
  }

  // 2. 본인 확인: 상품의 userId와 로그인한 유저의 ID 비교
  if (existingProduct.userId !== req.user.id) {
    throw new BadRequestError('본인이 등록한 상품만 수정할 수 있습니다.');
  }

  const updatedProduct = await prismaClient.product.update({
    where: { id },
    data: { name, description, price, tags, images },
  });

  return res.send(updatedProduct);
}

export async function deleteProduct(req, res) {
  const { id } = create(req.params, IdParamsStruct);
  const existingProduct = await prismaClient.product.findUnique({ where: { id } });

  if (!existingProduct) {
    throw new NotFoundError('product', id);
  }

  // 3. 본인 확인: 상품의 userId와 로그인한 유저의 ID 비교
  if (existingProduct.userId !== req.user.id) {
    throw new BadRequestError('본인이 등록한 상품만 삭제할 수 있습니다.');
  }

  await prismaClient.product.delete({ where: { id } });

  return res.status(204).send();
}

export async function getProductList(req, res) {
  const { page, pageSize, orderBy, keyword } = create(req.query, GetProductListParamsStruct);

  const where = keyword
    ? {
        OR: [{ name: { contains: keyword } }, { description: { contains: keyword } }],
      }
    : undefined;
  const totalCount = await prismaClient.product.count({ where });
  const products = await prismaClient.product.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: orderBy === 'recent' ? { id: 'desc' } : { id: 'asc' },
    where,
  });

  return res.send({
    list: products,
    totalCount,
  });
}

export async function createComment(req, res) {
  const { id: productId } = create(req.params, IdParamsStruct);
  const { content } = create(req.body, CreateCommentBodyStruct);

  const existingProduct = await prismaClient.product.findUnique({ where: { id: productId } });
  if (!existingProduct) {
    throw new NotFoundError('product', productId);
  }

  // 4. 댓글 작성자 정보 추가
  const userId = req.user.id;

  const comment = await prismaClient.comment.create({ 
    data: { productId, content, userId } 
  });

  return res.status(201).send(comment);
}

export async function getCommentList(req, res) {
  const { id: productId } = create(req.params, IdParamsStruct);
  const { cursor, limit } = create(req.query, GetCommentListParamsStruct);

  const existingProduct = await prismaClient.product.findUnique({ where: { id: productId } });
  if (!existingProduct) {
    throw new NotFoundError('product', productId);
  }

  const commentsWithCursorComment = await prismaClient.comment.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1,
    where: { productId },
  });
  const comments = commentsWithCursorComment.slice(0, limit);
  const cursorComment = commentsWithCursorComment[comments.length - 1];
  const nextCursor = cursorComment ? cursorComment.id : null;

  return res.send({
    list: comments,
    nextCursor,
  });
}
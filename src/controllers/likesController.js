import { prismaClient } from '../lib/prismaClient.js';

// 1. 상품 좋아요 토글
export async function toggleProductLike(req, res) {
  const userId = req.user.id;
  const { productId } = req.params;

  const where = {
    userId_productId: {
      userId: Number(userId),
      productId: Number(productId),
    },
  };

  const existingLike = await prismaClient.like.findUnique({ where });

  if (existingLike) {
    // 이미 있다면 취소 (삭제)
    await prismaClient.like.delete({ where });
    return res.json({ isLiked: false });
  } else {
    // 없다면 생성
    await prismaClient.like.create({
      data: {
        userId: Number(userId),
        productId: Number(productId),
      },
    });
    return res.json({ isLiked: true });
  }
}

// 2. 내가 좋아요 누른 상품 목록 조회
export async function getMyLikedProducts(req, res) {
  const userId = req.user.id;

  const likedProducts = await prismaClient.like.findMany({
    where: { userId: Number(userId), productId: { not: null } },
    include: { product: true }, // 연결된 상품 정보 포함
  });

  // 응답 데이터 가공 (상품 정보만 추출)
  const list = likedProducts.map((like) => like.product);
  res.send(list);
}
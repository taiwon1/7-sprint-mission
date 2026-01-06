// src/controllers/usersController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prismaClient } from '../lib/prismaClient.js';
import { BadRequestError } from '../lib/errors/BadRequestError.js';

// 1. 회원가입 (SignUp)
export const signUp = async (req, res) => {
  const { email, nickname, password } = req.body;

  if (!email || !nickname || !password) {
    throw new BadRequestError('이메일, 닉네임, 비밀번호는 필수입니다.');
  }

  const existingUser = await prismaClient.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError('이미 사용 중인 이메일입니다.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prismaClient.user.create({
    data: {
      email,
      nickname,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      createdAt: true,
    },
  });

  res.status(201).json(user);
};

// 2. 로그인 (SignIn) - 추가된 부분
export const signIn = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('이메일과 비밀번호를 입력해주세요.');
  }

  // 유저 찾기
  const user = await prismaClient.user.findUnique({
    where: { email },
  });

  // 유저가 없거나 비밀번호가 틀린 경우 (보안을 위해 에러 메시지는 동일하게 처리)
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new BadRequestError('이메일 또는 비밀번호가 일치하지 않습니다.');
  }

  // Access Token 발급
  const accessToken = jwt.sign(
    { userId: user.id }, // payload: 유저 식별 정보
    process.env.JWT_SECRET, // 환경 변수에 저장한 비밀키
    { expiresIn: '2h' } // 유효기간 2시간
  );

  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    },
  });
};

// 3. 내 정보 조회 (Me)
export const getMe = async (req, res) => {
  const userId = req.user.id; // authMiddleware에서 넣어준 유저 정보

  const user = await prismaClient.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      email: true,
      nickname: true,
      image: true, // 프로필 이미지
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(user);
};

// 4. 내 정보 수정 (Update Profile)
export const updateMe = async (req, res) => {
  const userId = req.user.id;
  const { nickname, image } = req.body;

  const updatedUser = await prismaClient.user.update({
    where: { id: Number(userId) },
    data: {
      nickname,
      image,
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      image: true,
    },
  });

  res.json(updatedUser);
};

// 5. 비밀번호 변경 (Change Password)
export const changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('현재 비밀번호와 새 비밀번호를 모두 입력해주세요.');
  }

  // DB에서 현재 유저 정보 가져오기
  const user = await prismaClient.user.findUnique({
    where: { id: Number(userId) },
  });

  // 현재 비밀번호 검증
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new BadRequestError('현재 비밀번호가 일치하지 않습니다.');
  }

  // 새 비밀번호 해싱 후 업데이트
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prismaClient.user.update({
    where: { id: Number(userId) },
    data: { password: hashedPassword },
  });

  res.status(204).send(); // 204 No Content
};

// 6. 내가 등록한 상품 목록 조회
export const getMyProducts = async (req, res) => {
  const userId = req.user.id;

  const products = await prismaClient.product.findMany({
    where: { userId: Number(userId) },
    orderBy: { created_at: 'desc' },
  });

  res.json(products);
};

export const getMyLikedProducts = async (req, res) => {
  const userId = req.user.id;

  const likedData = await prismaClient.like.findMany({
    where: { 
      userId: Number(userId),
      productId: { not: null } // 상품 좋아요만 필터링
    },
    include: {
      product: true // 상품 상세 정보 포함
    },
    orderBy: { 
      createdAt: 'desc' 
    }
  });

  // Like 객체에서 product 필드만 추출하여 배열로 반환
  const result = likedData.map((item) => item.product);
  
  return res.json(result);
};
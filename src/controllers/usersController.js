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
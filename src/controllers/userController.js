// src/controllers/usersController.js
import bcrypt from 'bcrypt';
import { prismaClient } from '../lib/prismaClient.js';
import { BadRequestError } from '../lib/errors/BadRequestError.js';

export const signUp = async (req, res) => {
  const { email, nickname, password } = req.body;

  // 1. 필수 값 체크
  if (!email || !nickname || !password) {
    throw new BadRequestError('이메일, 닉네임, 비밀번호는 필수입니다.');
  }

  // 2. 이메일 중복 체크
  const existingUser = await prismaClient.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError('이미 사용 중인 이메일입니다.');
  }

  // 3. 비밀번호 해싱 (암호화)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. 유저 생성
  const user = await prismaClient.user.create({
    data: {
      email,
      nickname,
      password: hashedPassword,
    },
    // 비밀번호는 응답에서 제외
    select: {
      id: true,
      email: true,
      nickname: true,
      createdAt: true,
    },
  });

  res.status(201).json(user);
};
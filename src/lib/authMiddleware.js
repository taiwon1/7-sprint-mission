import jwt from 'jsonwebtoken';
import { prismaClient } from './prismaClient.js';
import { BadRequestError } from './errors/BadRequestError.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: '로그인이 필요한 서비스입니다.' });
    }

    // 1. 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 2. 유저 조회 (Number로 변환)
    const user = await prismaClient.user.findUnique({
      where: { id: Number(decoded.userId) },
    });

    if (!user) {
      return res.status(404).json({ message: '존재하지 않는 유저입니다.' });
    }

    // 3. 유저 정보를 req 객체에 담아서 전달
    req.user = user;
    
    // 💡 여기서 next가 함수인지 확인 후 호출
    if (typeof next === 'function') {
      next();
    }
  } catch (error) {
    console.error('JWT Verify Error:', error.message);
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};
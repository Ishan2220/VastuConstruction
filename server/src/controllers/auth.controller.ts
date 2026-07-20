import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, user, 'User registered successfully'));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const result = await authService.login(email, password, ipAddress, userAgent);

  // Set refresh token in HttpOnly cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  res.json(
    new ApiResponse(200, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Login successful')
  );
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ApiError(401, 'Refresh token not found');
  }

  const result = await authService.refreshAccessToken(token);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  res.json(
    new ApiResponse(200, { accessToken: result.accessToken }, 'Token refreshed')
  );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  await authService.logout(token, req.user!.userId, ipAddress, userAgent);

  res.clearCookie('refreshToken', { path: '/' });
  res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getMe(req.user!.userId);
  res.json(new ApiResponse(200, user, 'User profile fetched'));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');
  
  const result = await authService.forgotPassword(email);
  res.json(new ApiResponse(200, result, 'Password reset successfully (Temporary test flow)'));
});

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
  const isProd = env.NODE_ENV === 'production';
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

  const isProd = env.NODE_ENV === 'production';
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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

  await authService.logout(token, ipAddress, userAgent);

  const isProd = env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    path: '/',
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
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
  res.json(new ApiResponse(200, null, 'If that email exists, a password reset link has been sent.'));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.userId, currentPassword, newPassword);
  res.json(new ApiResponse(200, null, 'Password changed successfully'));
});

export const changeEmail = asyncHandler(async (req: Request, res: Response) => {
  const { newEmail } = req.body;
  await authService.changeEmail(req.user!.userId, newEmail);
  res.json(new ApiResponse(200, null, 'Email changed successfully'));
});

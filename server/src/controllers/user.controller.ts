import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as userService from '../services/user.service.js';

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.listUsers();
  res.json(new ApiResponse(200, users, 'Users fetched successfully'));
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body, req.user!.userId);
  res.status(201).json(new ApiResponse(201, user, 'User created successfully'));
});

export const updateUserEmail = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');
  await userService.updateUserEmail(id, email);
  res.json(new ApiResponse(200, null, 'User email updated successfully'));
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { newPassword } = req.body;
  if (!newPassword) throw new ApiError(400, 'New password is required');
  await userService.resetUserPassword(id, newPassword);
  res.json(new ApiResponse(200, null, 'User password reset successfully'));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (id === req.user!.userId) {
    throw new ApiError(400, 'You cannot delete yourself');
  }
  await userService.deleteUser(id);
  res.json(new ApiResponse(200, null, 'User deleted successfully'));
});

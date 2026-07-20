import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        name: string;
        email: string;
        tempAdminUntil?: Date | null;
        tempAdminPages?: string[];
      };
    }
  }
}

export {};

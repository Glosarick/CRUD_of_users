import { RouteError } from '@src/common/util/route-errors';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';

import UserRepo from '@src/repos/UserRepo';
import { IUser } from '@src/models/User';


/******************************************************************************
                                Constants
******************************************************************************/

export const USER_NOT_FOUND_ERR = 'User not found';
export const EMAIL_ALREADY_EXISTS_ERR = 'Email already exists';


/******************************************************************************
                                Functions
******************************************************************************/

/**
 * Get all users.
 */
type GetAllOptions = {
  q?: string;
  page?: number;
  limit?: number;
};

async function getAll(opts?: GetAllOptions): Promise<{ users: IUser[]; total: number; page: number; limit: number }> {
  const q = (opts && opts.q) ? String(opts.q).trim().toLowerCase() : '';
  const page = (opts && opts.page && opts.page > 0) ? Math.floor(opts.page) : 1;
  const limit = (opts && opts.limit && opts.limit > 0) ? Math.floor(opts.limit) : 25;

  const all = await UserRepo.getAll();

  // normalize function: remove diacritics and lower
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  let filtered = all;
  if (q) {
    const tokens = q.split(/\s+/).map(t => normalize(t)).filter(Boolean);
    filtered = all.filter(u => {
      const name = normalize(u.name || '');
      const email = normalize(u.email || '');
      return tokens.some(tok => name.includes(tok) || email.includes(tok));
    });
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const users = filtered.slice(start, end);

  return { users, total, page, limit };
}

/**
 * Add one user.
 */
const sanitizeUserInput = (user: IUser): IUser => ({
  ...user,
  name: user.name.trim(),
  email: user.email.trim().toLowerCase(),
});

async function addOne(user: IUser): Promise<IUser> {
  const sanitizedUser = sanitizeUserInput(user);
  const existing = await UserRepo.getOne(sanitizedUser.email);
  if (existing) {
    throw new RouteError(
      HttpStatusCodes.CONFLICT,
      EMAIL_ALREADY_EXISTS_ERR,
    );
  }
  return UserRepo.add(sanitizedUser);
}

/**
 * Update one user.
 */
async function updateOne(user: IUser): Promise<void> {
  const sanitizedUser = sanitizeUserInput(user);
  const persists = await UserRepo.persists(sanitizedUser.id);
  if (!persists) {
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      USER_NOT_FOUND_ERR,
    );
  }
  const existing = await UserRepo.getOne(sanitizedUser.email);
  if (existing && existing.id !== sanitizedUser.id) {
    throw new RouteError(
      HttpStatusCodes.CONFLICT,
      EMAIL_ALREADY_EXISTS_ERR,
    );
  }
  // Return user
  return UserRepo.update(sanitizedUser);
}

/**
 * Delete a user by their id.
 */
async function _delete(id: number): Promise<void> {
  const persists = await UserRepo.persists(id);
  if (!persists) {
    throw new RouteError(
      HttpStatusCodes.NOT_FOUND,
      USER_NOT_FOUND_ERR,
    );
  }
  // Delete user
  return UserRepo.delete(id);
}


/******************************************************************************
                                Export default
******************************************************************************/

export default {
  getAll,
  addOne,
  updateOne,
  delete: _delete,
} as const;

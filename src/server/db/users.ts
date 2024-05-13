import { eq } from "drizzle-orm";

import type { db } from "~/server/db";
import { users } from "./schema";

type DB = typeof db;

export const getUserByEmail = async (database: DB, email: string) => {
  const queriedUsers = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!queriedUsers.length && !queriedUsers[0]) return null;

  const user = queriedUsers[0]!;

  return user;
};

export const createUser = async (
  database: DB,
  user: { id: string; email: string; password: string },
) => {
  return await database.insert(users).values(user);
};

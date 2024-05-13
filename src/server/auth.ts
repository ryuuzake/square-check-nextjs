import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { z } from "zod";
import { verify } from "@node-rs/argon2";

import { env } from "~/env";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";
import { getUserByEmail } from "./db/users";

export const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

/**
 * Module augmentation for `lucia` types. Allows us give type check from our config
 *
 * @see https://lucia-auth.com/basics/configuration
 */
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  id: string;
  email: string;
  image?: string;
}

/**
 * Options for lucia used to configure adapters
 *
 * @see https://lucia-auth.com/getting-started/nextjs-app
 */
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    // this sets cookies with super long expiration
    // since Next.js doesn't allow Lucia to extend cookie expiration when rendering pages
    expires: false,
    attributes: {
      // set to `true` when using HTTPS
      secure: env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      email: attributes.email,
      image: attributes.image,
    };
  },
});

const emailPasswordSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export type AuthErrorType = "InvalidCredentials";

export class AuthError extends Error {
  public type: AuthErrorType;

  constructor(message: string, type: AuthErrorType = "InvalidCredentials") {
    super(message);
    this.name = "AuthError";
    this.type = type;
  }
}

export const login = async (formData: FormData) => {
  const { data, error } = await emailPasswordSchema.safeParseAsync(
    Object.fromEntries(formData.entries()),
  );

  if (error) throw new AuthError("Invalid email or password");

  const { email, password } = data;

  const user = await getUserByEmail(db, email);

  if (!user) {
    // NOTE:
    // Returning immediately allows malicious actors to figure out valid emails from response times,
    // allowing them to only focus on guessing passwords in brute-force attacks.
    // As a preventive measure, you may want to hash passwords even for invalid emails.
    // However, valid emails can be already be revealed with the signup page
    // and a similar timing issue can likely be found in password reset implementation.
    // It will also be much more resource intensive.
    // Since protecting against this is non-trivial,
    // it is crucial your implementation is protected against brute-force attacks with login throttling etc.
    // If emails/usernames are public, you may outright tell the user that the username is invalid.
    throw new AuthError("Invalid email or password");
  }

  const validPassword = await verify(user.password, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  if (!validPassword) {
    throw new AuthError("Invalid email or password");
  }

  try {
    const session = await lucia.createSession(user.id, {
      email: user.email,
    });

    const sessionCookie = lucia.createSessionCookie(session.id);

    return sessionCookie;
  } catch {
    await lucia.invalidateUserSessions(user.id);

    const session = await lucia.createSession(user.id, {
      email: user.email,
    });

    const sessionCookie = lucia.createSessionCookie(session.id);

    return sessionCookie;
  }
};

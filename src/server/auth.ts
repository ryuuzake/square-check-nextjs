import { cache } from "react";
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { cookies } from "next/headers";

import { env } from "~/env";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";

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

/**
 * Helper for get user info from session cookies.
 *
 * @see https://lucia-auth.com/guides/validate-session-cookies/nextjs-app
 */
export const getUser = cache(async () => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return null;
  const { user, session } = await lucia.validateSession(sessionId);
  try {
    if (session?.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
    }
    if (!session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      cookies().set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
    }
  } catch {
    // Next.js throws error when attempting to set cookies when rendering page
  }
  return user;
});

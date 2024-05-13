"use server";

import { cache } from "react";
import { cookies } from "next/headers";

import { lucia } from "~/server/auth";

/**
 * Helper for validating user request from session cookies.
 *
 * @see https://lucia-auth.com/tutorials/username-and-password/nextjs-app
 */
export const validateRequest = cache(async () => {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) return { user: null, session: null };

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
  } catch (e) {
    // Next.js throws error when attempting to set cookies when rendering page
  }
  return { user, session };
});

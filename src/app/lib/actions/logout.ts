"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { lucia } from "~/server/auth";
import { validateRequest } from "./validateRequest";

export async function logout() {
  const { session } = await validateRequest();

  if (!session) {
    return {
      error: "Unauthorized",
    };
  }

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes,
  );
  return redirect("/auth/login");
}

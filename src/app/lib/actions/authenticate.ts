"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError, login } from "~/server/auth";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const sessionCookie = await login(formData);

    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return redirect("/");
  } catch (e) {
    if (e instanceof AuthError) {
      switch (e.type) {
        case "InvalidCredentials":
          return e.message;
        default:
          return "Something went wrong.";
      }
    }

    throw e;
  }
}

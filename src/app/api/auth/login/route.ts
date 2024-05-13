import type { NextRequest } from "next/server";
import { AuthError, login } from "~/server/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    const sessionCookie = await login(formData);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      switch (e.type) {
        case "InvalidCredentials":
          return new Response(e.message, {
            status: 400,
          });
        default:
          return new Response("Something went wrong.", {
            status: 500,
          });
      }
    }

    throw e;
  }
}

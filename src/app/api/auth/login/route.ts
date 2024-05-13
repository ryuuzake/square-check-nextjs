import type { NextRequest } from "next/server";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { db } from "~/server/db";
import { getUserByEmail } from "~/server/db/users";
import { lucia } from "~/server/auth";

const emailPasswordSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const { data, error } = await emailPasswordSchema.safeParseAsync(formData);

  if (error) {
    return new Response("Invalid email or password", {
      status: 400,
    });
  }

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
    return new Response("Invalid email or password", {
      status: 400,
    });
  }

  const validPassword = await verify(user.password, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  if (!validPassword) {
    return new Response("Invalid email or password", {
      status: 400,
    });
  }

  const session = await lucia.createSession(user.id, {
    id: user.id,
    email: user.email,
  });
  const sessionCookie = lucia.createSessionCookie(session.id);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
}

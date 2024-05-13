import { type NextRequest } from "next/server";
import { z } from "zod";
import { generateIdFromEntropySize } from "lucia";
import { hash } from "@node-rs/argon2";
import { createUser } from "~/server/db/users";
import { db } from "~/server/db";
import { lucia } from "~/server/auth";

const emailPasswordSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const { data, error } = await emailPasswordSchema.safeParseAsync(formData);

  if (error) {
    return new Response(error.message, {
      status: 400,
    });
  }

  const { email, password } = data;

  const passwordHash = await hash(password, {
    // recommended minimum parameters
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  const userId = generateIdFromEntropySize(10); // 16 characters long

  try {
    await createUser(db, {
      id: userId,
      email,
      password: passwordHash,
    });

    const session = await lucia.createSession(userId, { id: userId, email });
    const sessionCookie = lucia.createSessionCookie(session.id);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": sessionCookie.serialize(),
      },
    });
  } catch {
    // db error, email taken, etc
    return new Response("Email already used", {
      status: 400,
    });
  }
}

import { logout } from "~/app/lib/actions/logout";

export default async function LogoutPage() {
  return (
    <form action={logout}>
      <button>Sign out</button>
    </form>
  );
}

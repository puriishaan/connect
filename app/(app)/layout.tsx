import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold tracking-tight">CONNECT</Link>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link href="/modes/catchup" className="hover:text-black">Catch Up</Link>
          <Link href="/modes/update" className="hover:text-black">Update</Link>
          <Link href="/modes/respond" className="hover:text-black">Respond</Link>
          <Link href="/modes/reachout" className="hover:text-black">Reach Out</Link>
          <Link href="/contacts" className="hover:text-black">Contacts</Link>
          <Link href="/settings" className="hover:text-black">Settings</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-gray-400 hover:text-black">Sign out</button>
          </form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

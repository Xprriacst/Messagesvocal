import { redirect } from "next/navigation";
import { authConfigured, isAuthed, setAuthCookie } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (password && password === process.env.APP_PASSWORD) {
    await setAuthCookie();
    redirect("/");
  }
  redirect("/login?error=1");
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authConfigured()) redirect("/");
  if (await isAuthed()) redirect("/");
  const params = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">Accès protégé</h1>
        <p className="mt-1 text-sm text-slate-500">Saisissez le mot de passe pour accéder au dashboard.</p>
        <form action={login} className="mt-5 space-y-3">
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Mot de passe"
          />
          {params.error && (
            <p className="text-xs text-red-600">Mot de passe incorrect.</p>
          )}
          <button type="submit" className="w-full rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Entrer
          </button>
        </form>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import Wizard from "@/components/Wizard";
import { authConfigured, isAuthed } from "@/lib/auth";

export default async function HomePage() {
  if (authConfigured() && !(await isAuthed())) {
    redirect("/login");
  }
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Diffuser un message vocal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Trois étapes : importez vos contacts, votre MP3, et lancez la campagne.
        </p>
      </div>
      <Wizard />
    </div>
  );
}

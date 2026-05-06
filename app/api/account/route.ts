import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getAccount } from "@/lib/allmysms";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const info = await getAccount();
    if (!info) {
      return NextResponse.json({ error: "Impossible de joindre AllMySMS" }, { status: 502 });
    }
    return NextResponse.json({
      balance: info.balance,
      company: info.company,
      email: info.email
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erreur inconnue" },
      { status: 500 }
    );
  }
}

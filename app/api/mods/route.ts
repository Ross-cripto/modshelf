import { SEED_MODS } from "@/lib/seed-mods";

export async function GET() {
  return Response.json(
    { mods: SEED_MODS },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}

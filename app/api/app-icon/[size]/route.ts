import { renderAppIcon } from "@/lib/share-card";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const n = Number((await ctx.params).size);
  return renderAppIcon([180, 192, 512].includes(n) ? n : 512);
}

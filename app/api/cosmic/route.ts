import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getCosmicState } from "@/lib/domain/cosmic";

export const dynamic = "force-dynamic";

export function GET() {
  ensureBootstrapped();
  return ok(getCosmicState());
}

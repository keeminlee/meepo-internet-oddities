import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getCosmicState, listThresholds } from "@/lib/domain/cosmic";

export const dynamic = "force-dynamic";

export function GET() {
  ensureBootstrapped();
  const cosmic = getCosmicState();
  const thresholds = listThresholds();
  return ok({ ...cosmic, thresholds });
}

import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { listCreators } from "@/lib/domain/creators";

export function GET() {
  ensureBootstrapped();
  return ok(listCreators());
}

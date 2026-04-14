import { ok } from "@/lib/api/response";
import { ensureBootstrapped } from "@/lib/db/bootstrap";
import { getFeatured } from "@/lib/domain/projects";

export function GET() {
  ensureBootstrapped();
  return ok(getFeatured());
}

import { getDb } from "../db";

import { getUserByHandle } from "./users";
import type { Creator, CreatorRow } from "./types";
import { mapCreator, userToCreatorShape } from "./types";

export function listCreators(): Creator[] {
  const rows = getDb()
    .prepare<[], CreatorRow>("SELECT * FROM creators ORDER BY handle")
    .all();
  return rows.map(mapCreator);
}

export function getCreatorByHandle(handle: string): Creator | null {
  const row = getDb()
    .prepare<[string], CreatorRow>("SELECT * FROM creators WHERE handle = ?")
    .get(handle);
  if (row) return mapCreator(row);
  // Fallback to the users table so OAuth-only users with a handle also resolve.
  const user = getUserByHandle(handle);
  return user ? userToCreatorShape(user) : null;
}

export function getCreatorById(id: string): Creator | null {
  const row = getDb()
    .prepare<[string], CreatorRow>("SELECT * FROM creators WHERE id = ?")
    .get(id);
  return row ? mapCreator(row) : null;
}

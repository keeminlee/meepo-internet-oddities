"use client";

import { useRouter } from "next/navigation";

import { SnapshotNav } from "@/components/SnapshotNav";
import { SnapshotView } from "@/components/SnapshotView";
import type { ProjectSnapshot, SnapshotScreenshot } from "@/lib/types/snapshot";

interface SnapshotPageClientProps {
  slug: string;
  snapshot: ProjectSnapshot & { screenshots: SnapshotScreenshot[] };
  totalVersions: number;
  isOwner?: boolean;
  isViewingLatest?: boolean;
  /** projects.why_i_made_this — owner-editable maker note, lives on the
   *  projects row (not the snapshot). Threaded in so the inline editor can
   *  expose it without an extra fetch. */
  whyMade?: string;
  /** projects.repo_url — same reasoning. */
  repoUrl?: string;
}

export function SnapshotPageClient({
  slug,
  snapshot,
  totalVersions,
  isOwner = false,
  isViewingLatest = false,
  whyMade = "",
  repoUrl = "",
}: SnapshotPageClientProps) {
  const router = useRouter();

  function handleVersionChange(version: number) {
    router.push(`/project/${slug}?v=${version}`);
  }

  return (
    <div className="space-y-6">
      <SnapshotNav
        currentVersion={snapshot.version_number}
        totalVersions={totalVersions}
        onChange={handleVersionChange}
      />
      <SnapshotView
        slug={slug}
        snapshot={snapshot}
        isOwner={isOwner}
        isViewingLatest={isViewingLatest}
        whyMade={whyMade}
        repoUrl={repoUrl}
      />
      {totalVersions > 1 && (
        <SnapshotNav
          currentVersion={snapshot.version_number}
          totalVersions={totalVersions}
          onChange={handleVersionChange}
        />
      )}
    </div>
  );
}

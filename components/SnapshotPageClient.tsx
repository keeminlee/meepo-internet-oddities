"use client";

import { useRouter } from "next/navigation";

import { SnapshotNav } from "@/components/SnapshotNav";
import { SnapshotView } from "@/components/SnapshotView";
import type { ProjectSnapshot, SnapshotScreenshot } from "@/lib/types/snapshot";

interface SnapshotPageClientProps {
  slug: string;
  snapshot: ProjectSnapshot & { screenshots: SnapshotScreenshot[] };
  totalVersions: number;
}

export function SnapshotPageClient({ slug, snapshot, totalVersions }: SnapshotPageClientProps) {
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
      <SnapshotView slug={slug} snapshot={snapshot} />
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

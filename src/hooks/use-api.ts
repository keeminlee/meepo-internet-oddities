import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProjectWithCreator, Creator } from "@/types";

const API = "/api";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Projects ────────────────────────────────────────────

export function useProjects(tag?: string) {
  const params = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return useQuery<ProjectWithCreator[]>({
    queryKey: ["projects", tag ?? "all"],
    queryFn: () => fetchJSON(`${API}/projects${params}`),
  });
}

export function useFeaturedProjects() {
  return useQuery<ProjectWithCreator[]>({
    queryKey: ["projects", "featured"],
    queryFn: () => fetchJSON(`${API}/projects/featured`),
  });
}

export function useNewestProjects(count = 6) {
  return useQuery<ProjectWithCreator[]>({
    queryKey: ["projects", "newest", count],
    queryFn: () => fetchJSON(`${API}/projects/newest?count=${count}`),
  });
}

export function useProject(slug: string) {
  return useQuery<ProjectWithCreator>({
    queryKey: ["project", slug],
    queryFn: () => fetchJSON(`${API}/projects/${slug}`),
    enabled: !!slug,
  });
}

// ── Creators ────────────────────────────────────────────

export function useCreators() {
  return useQuery<Creator[]>({
    queryKey: ["creators"],
    queryFn: () => fetchJSON(`${API}/creators`),
  });
}

export function useCreator(handle: string) {
  return useQuery<Creator & { projects: ProjectWithCreator[] }>({
    queryKey: ["creator", handle],
    queryFn: () => fetchJSON(`${API}/creators/${handle}`),
    enabled: !!handle,
  });
}

// ── Click tracking ──────────────────────────────────────

export function useTrackClick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`${API}/projects/${slug}/click`, { method: "POST" });
      if (!res.ok) throw new Error("Click tracking failed");
      return res.json() as Promise<{ clicks_sent: number; external_url: string }>;
    },
    onSuccess: (_data, slug) => {
      qc.invalidateQueries({ queryKey: ["project", slug] });
    },
  });
}

// ── Submission ──────────────────────────────────────────

interface SubmitPayload {
  name: string;
  external_url: string;
  one_line_pitch: string;
  screenshot_url?: string;
  built_with: string;
  tags?: string[];
  status?: string;
  about?: string;
  why_i_made_this?: string;
  creator_name: string;
  creator_handle?: string;
  creator_bio?: string;
  creator_thesis?: string;
  contact_email?: string;
}

export function useSubmitProject() {
  return useMutation({
    mutationFn: async (payload: SubmitPayload) => {
      const res = await fetch(`${API}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      return res.json() as Promise<{ id: string; slug: string; message: string }>;
    },
  });
}

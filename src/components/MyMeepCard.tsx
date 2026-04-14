import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/TagBadge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

function StatusPill({ meep }: { meep: any }) {
  const cls = meep.approved
    ? "bg-green-500/15 text-green-400"
    : meep.rejected
      ? "bg-red-500/15 text-red-400"
      : "bg-yellow-500/15 text-yellow-400";
  const label = meep.approved ? "Approved" : meep.rejected ? "Rejected" : "Pending";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

interface MyMeepCardProps {
  meep: any;
  onEdit?: (m: any) => void;
}

export function MyMeepCard({ meep, onEdit }: MyMeepCardProps) {
  const [imgError, setImgError] = useState(false);
  const showStatus = !meep.approved || meep.rejected;
  const cardInner = (
    <div className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative overflow-hidden">
        <AspectRatio ratio={16 / 9}>
          {meep.screenshot_url && !imgError ? (
            <img
              src={meep.screenshot_url}
              alt={meep.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-4xl">
              🌐
            </div>
          )}
        </AspectRatio>
      </div>

      <div className="space-y-3 p-4">
        {(showStatus || onEdit) && (
          <div className="flex items-center justify-between gap-2">
            {showStatus ? <StatusPill meep={meep} /> : <span />}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(meep);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        )}

        <div>
          <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
            {meep.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meep.one_line_pitch}</p>
        </div>

        {meep.rejected && meep.rejection_reason && (
          <p className="text-sm text-red-400/80 italic">Reason: {meep.rejection_reason}</p>
        )}

        {meep.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {meep.tags.map((tag: any) => (
              <TagBadge key={tag} tag={tag} size="sm" />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 border-t border-border pt-1 text-xs text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5" />
          <span className="font-medium">{(meep.clicks_sent || 0).toLocaleString()}</span>
          <span>clicks sent</span>
        </div>
      </div>
    </div>
  );

  return meep.approved ? (
    <Link to={`/meep/${meep.slug}`} className="block">
      {cardInner}
    </Link>
  ) : (
    cardInner
  );
}

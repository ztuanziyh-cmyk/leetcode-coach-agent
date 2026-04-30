import { Badge } from "@/components/badge";

export function DataSourceBadge({
  live,
  compact = false,
}: {
  live: boolean;
  compact?: boolean;
}) {
  return (
    <Badge tone={live ? "good" : "warn"}>
      {live
        ? compact
          ? "Live synced local data"
          : "Using live synced local data"
        : compact
          ? "Mock fallback data"
          : "Using mock fallback data"}
    </Badge>
  );
}

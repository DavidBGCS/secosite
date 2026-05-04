import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";

type ReplacementRecord = {
  id: string;
  assetRef: string;
  assetType: string;
  location?: string;
  replacedWith?: string;
  date: string;
  engineer?: string;
  visitId?: string;
  notes?: string;
};

export function ReplacementHistoryPage() {
  const { siteFileId } = useParams<{ siteFileId: string }>();

  const [records, setRecords] = useState<ReplacementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: replace with real data source
    const mock: ReplacementRecord[] = [
      {
        id: "1",
        assetRef: "L1-023",
        assetType: "Optical Detector",
        location: "Corridor Outside Office",
        replacedWith: "Apollo XP95 Optical",
        date: "2026-03-25T10:20:00Z",
        engineer: "David",
        notes: "False alarms reported",
      },
      {
        id: "2",
        assetRef: "L2-011",
        assetType: "Manual Call Point",
        location: "Rear Exit",
        replacedWith: "New MCP Unit",
        date: "2026-03-25T09:10:00Z",
        engineer: "David",
      },
    ];

    setTimeout(() => {
      setRecords(mock);
      setLoading(false);
    }, 300);
  }, []);

  // 🇮🇪 Irish formatted date
  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-IE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, ReplacementRecord[]> = {};

    records.forEach((r) => {
      const key = formatDate(r.date);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });

    return map;
  }, [records]);

  return (
    <AppLayout
      title="Replacement History"
      subtitle="Parts replaced across all visits"
    >
      {loading ? (
        <div style={emptyStateStyle}>Loading replacement history…</div>
      ) : records.length === 0 ? (
        <div style={emptyStateStyle}>No replacements recorded</div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={sectionStyle}>
            <div style={sectionHeaderStyle}>{date}</div>

            <div style={cardListStyle}>
              {items.map((r) => (
                <div key={r.id} style={cardStyle}>
                  <div style={cardTopRow}>
                    <div style={assetRefStyle}>{r.assetRef}</div>
                    <div style={badgeStyle}>Replaced</div>
                  </div>

                  <div style={assetTypeStyle}>{r.assetType}</div>

                  {r.location && (
                    <div style={locationStyle}>{r.location}</div>
                  )}

                  {r.replacedWith && (
                    <div style={replacementStyle}>
                      → {r.replacedWith}
                    </div>
                  )}

                  <div style={metaRow}>
                    {r.engineer && (
                      <span style={metaText}>👷 {r.engineer}</span>
                    )}
                  </div>

                  {r.notes && (
                    <div style={notesStyle}>{r.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </AppLayout>
  );
}

/* =======================
   STYLES (POLISHED UI)
======================= */

const sectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const sectionHeaderStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "0.95rem",
  color: "#6b7280",
  marginBottom: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const cardListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "14px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 6px 14px rgba(15,23,42,0.05)",
};

const cardTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
};

const assetRefStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "0.95rem",
  color: "#111827",
};

const badgeStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  fontSize: "0.7rem",
  fontWeight: 700,
  padding: "4px 8px",
  borderRadius: "999px",
};

const assetTypeStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#374151",
};

const locationStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "#6b7280",
  marginTop: "4px",
};

const replacementStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#2563eb",
};

const metaRow: React.CSSProperties = {
  marginTop: "8px",
};

const metaText: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "#6b7280",
};

const notesStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "0.85rem",
  color: "#374151",
  background: "#f9fafb",
  padding: "8px",
  borderRadius: "10px",
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "40px 0",
  color: "#6b7280",
};
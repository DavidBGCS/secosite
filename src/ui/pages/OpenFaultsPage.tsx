import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";

type Fault = {
  id: string;
  reference: string;
  description: string;
  location?: string;
  assetRef?: string;
  status: "open" | "in-progress" | "urgent";
  reportedAt: string;
  visitId?: string;
};

export function OpenFaultsPage() {
  const { siteFileId } = useParams<{ siteFileId: string }>();
  const navigate = useNavigate();

  const [faults, setFaults] = useState<Fault[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: replace with Firestore
    const mock: Fault[] = [
      {
        id: "1",
        reference: "F-001",
        description: "Detector contamination fault",
        location: "Office Corridor",
        assetRef: "L1-023",
        status: "open",
        reportedAt: "2026-03-28T10:00:00Z",
      },
      {
        id: "2",
        reference: "F-002",
        description: "Sounder not activating",
        location: "Warehouse",
        assetRef: "L2-011",
        status: "urgent",
        reportedAt: "2026-03-29T09:30:00Z",
      },
    ];

    setTimeout(() => {
      setFaults(mock);
      setLoading(false);
    }, 300);
  }, []);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("en-IE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));

  const statusStyle = (status: string): React.CSSProperties => {
    const base = {
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 800,
    };

    switch (status) {
      case "urgent":
        return { ...base, background: "#fee2e2", color: "#b91c1c" };
      case "in-progress":
        return { ...base, background: "#dbeafe", color: "#1d4ed8" };
      default:
        return { ...base, background: "#fef3c7", color: "#92400e" };
    }
  };

  const sorted = useMemo(() => {
    return [...faults].sort((a, b) =>
      (b.reportedAt ?? "").localeCompare(a.reportedAt ?? "")
    );
  }, [faults]);

  const closeFault = (id: string) => {
    if (!window.confirm("Close this fault?")) return;

    setFaults((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <AppLayout title="Open Faults" subtitle="Active system issues">
      {loading ? (
        <div style={emptyStyle}>Loading faults…</div>
      ) : faults.length === 0 ? (
        <div style={emptyStyle}>No open faults 🎉</div>
      ) : (
        <div style={listStyle}>
          {sorted.map((f) => (
            <div key={f.id} style={cardStyle}>
              <div style={topRow}>
                <div style={refStyle}>{f.reference}</div>
                <div style={statusStyle(f.status)}>{f.status}</div>
              </div>

              <div style={descStyle}>{f.description}</div>

              {f.location && (
                <div style={locationStyle}>📍 {f.location}</div>
              )}

              {f.assetRef && (
                <div style={assetStyle}>Asset: {f.assetRef}</div>
              )}

              <div style={metaRow}>
                Reported: {formatDate(f.reportedAt)}
              </div>

              <div style={actionsRow}>
                <button
                  style={primaryBtn}
                  onClick={() =>
                    navigate(`/site/${siteFileId}/visit/new?fault=${f.id}`)
                  }
                >
                  Action
                </button>

                <button
                  style={secondaryBtn}
                  onClick={() => closeFault(f.id)}
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

/* STYLES */

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "16px",
  padding: "14px",
  border: "1px solid #e5e7eb",
};

const topRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
};

const refStyle: React.CSSProperties = {
  fontWeight: 800,
};

const descStyle: React.CSSProperties = {
  marginTop: "6px",
  fontWeight: 600,
};

const locationStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#6b7280",
};

const assetStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "0.85rem",
  color: "#374151",
};

const metaRow: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "0.8rem",
  color: "#6b7280",
};

const actionsRow: React.CSSProperties = {
  marginTop: "10px",
  display: "flex",
  gap: "8px",
};

const primaryBtn: React.CSSProperties = {
  flex: 1,
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "10px",
  borderRadius: "10px",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  background: "#f3f4f6",
  border: "none",
  padding: "10px",
  borderRadius: "10px",
  cursor: "pointer",
};

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "40px",
  color: "#6b7280",
};
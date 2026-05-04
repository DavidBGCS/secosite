import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { SiteFile } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";

import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  Field,
  SecondaryButton,
  inputStyle,
} from "../components/ui";

import type {
  PartActionRecord,
  PartDiscipline,
} from "../../core/types/parts";
import { PART_DISCIPLINE_OPTIONS } from "../../core/types/parts";
import { formatIrishDateTime } from "../utils/dateTime";

type SiteFileWithParts = SiteFile & {
  partActions?: PartActionRecord[];
};

const DISCIPLINE_LABELS: Record<PartDiscipline | "all", string> = {
  all: "All",
  "fire-alarm": "Fire Alarm",
  "intruder-alarm": "Intruder Alarm",
  cctv: "CCTV",
  "access-control": "Access Control",
  "emergency-lighting": "Emergency Lighting",
};

function toActionLabel(value?: string) {
  if (!value) return "Action";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SitePartsHistoryPage() {
  const navigate = useNavigate();
  const { siteFile, loading, error } = useFirestoreSite();

  const typedSiteFile = siteFile as SiteFileWithParts | undefined;

  const [search, setSearch] = useState("");
  const [selectedDiscipline, setSelectedDiscipline] = useState<
    PartDiscipline | "all"
  >("all");

  const actions = useMemo(() => {
    if (!typedSiteFile) return [];

    const raw = typedSiteFile.partActions ?? [];
    const q = search.trim().toLowerCase();

    return [...raw]
      .filter((action) => {
        const disciplineMatch =
          selectedDiscipline === "all" ||
          action.discipline === selectedDiscipline;

        const text = [
          action.title,
          action.manufacturer,
          action.partCode,
          action.category,
          action.locationText,
          action.linkedAssetReference,
          action.engineerName,
          action.discipline,
          action.actionType,
          action.note,
          action.sourceType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const searchMatch = !q || text.includes(q);

        return disciplineMatch && searchMatch;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [typedSiteFile, search, selectedDiscipline]);

  if (loading) {
    return (
      <AppLayout title="Parts History">
        <Card>Loading parts history...</Card>
      </AppLayout>
    );
  }

  if (error || !typedSiteFile) {
    return (
      <AppLayout title="Parts History Error">
        <Card>{error || "Site not found"}</Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Parts History"
      subtitle={`${typedSiteFile.site.name} • ${typedSiteFile.site.siteCode ?? typedSiteFile.site.id}`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>PARTS ACTIVITY LOG</div>
              <div style={heroTitleStyle}>Site Parts History</div>
              <div style={heroSubStyle}>
                Full record of installed, replaced, removed, and temporary parts
                across all disciplines.
              </div>
            </div>

            <div style={heroBadgeStyle}>{actions.length} Actions</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Filters</CardTitle>

          <div style={filterGridStyle}>
            <Field label="Search">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
                placeholder="Part, engineer, asset ref, location..."
              />
            </Field>

            <Field label="Discipline">
              <div style={chipWrapStyle}>
                <Chip
                  label="All"
                  active={selectedDiscipline === "all"}
                  onClick={() => setSelectedDiscipline("all")}
                />
                {PART_DISCIPLINE_OPTIONS.map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={selectedDiscipline === option.value}
                    onClick={() => setSelectedDiscipline(option.value)}
                  />
                ))}
              </div>
            </Field>

            <div style={actionRowStyle}>
              <SecondaryButton
                onClick={() =>
                  navigate(`/site/${typedSiteFile.metadata.siteFileId}/parts`)
                }
              >
                Back to Parts
              </SecondaryButton>

              <SecondaryButton
                onClick={() =>
                  navigate(`/site/${typedSiteFile.metadata.siteFileId}/overview`)
                }
              >
                Back to Overview
              </SecondaryButton>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Activity</CardTitle>

          {actions.length === 0 ? (
            <p style={emptyTextStyle}>No parts activity recorded yet.</p>
          ) : (
            <div style={historyGridStyle}>
              {actions.map((action) => (
                <div key={action.id} style={historyCardStyle}>
                  <div style={historyTopRowStyle}>
                    <div>
                      <div style={historyTitleStyle}>{action.title}</div>
                      <div style={historyMetaStyle}>
                        {DISCIPLINE_LABELS[action.discipline]} •{" "}
                        {toActionLabel(action.actionType)}
                      </div>
                    </div>

                    <div style={pillWrapStyle}>
                      <span style={quantityPillStyle}>
                        Qty {action.quantity}
                      </span>
                      <span style={statusPillStyle}>
                        {action.sourceType ?? "Unknown Source"}
                      </span>
                    </div>
                  </div>

                  <div style={detailGridStyle}>
                    <div>
                      <strong>Engineer:</strong> {action.engineerName || "—"}
                    </div>
                    <div>
                      <strong>Time:</strong>{" "}
                      {action.createdAt
                        ? formatIrishDateTime(action.createdAt)
                        : "—"}
                    </div>
                    <div>
                      <strong>Manufacturer:</strong>{" "}
                      {action.manufacturer || "—"}
                    </div>
                    <div>
                      <strong>Part Code:</strong> {action.partCode || "—"}
                    </div>
                    <div>
                      <strong>Category:</strong> {action.category || "—"}
                    </div>
                    <div>
                      <strong>Visit:</strong> {action.visitId || "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Location:</strong> {action.locationText || "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Linked Asset:</strong>{" "}
                      {action.linkedAssetReference || "—"}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Note:</strong> {action.note || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? chipActiveStyle : chipStyle}
    >
      {label}
    </button>
  );
}

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const heroWrapStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "12px",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#6b7280",
  marginBottom: "6px",
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "1.45rem",
  fontWeight: 800,
  lineHeight: 1.1,
  color: "#111827",
  marginBottom: "6px",
};

const heroSubStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.95rem",
  lineHeight: 1.45,
  maxWidth: "700px",
};

const heroBadgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "8px 12px",
  background: "#eef2ff",
  color: "#3730a3",
  fontSize: "0.82rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const chipWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const chipStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  borderRadius: "999px",
  padding: "10px 12px",
  fontSize: "0.88rem",
  cursor: "pointer",
};

const chipActiveStyle: React.CSSProperties = {
  ...chipStyle,
  background: "#111827",
  color: "#fff",
  border: "1px solid #111827",
};

const actionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const historyGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const historyCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#f8fafc",
  display: "grid",
  gap: "12px",
};

const historyTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const historyTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#111827",
};

const historyMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontWeight: 700,
  fontSize: "0.92rem",
};

const pillWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  justifyContent: "end",
};

const quantityPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "0.76rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const statusPillStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  background: "#f3f4f6",
  color: "#374151",
  fontSize: "0.76rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  color: "#374151",
  fontSize: "0.92rem",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};
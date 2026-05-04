// src/ui/pages/ClosedFaultsPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FaultRecord, SiteFile } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  Field,
  PrimaryButton,
  SecondaryButton,
  inputStyle,
} from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";

function nowIso() {
  return new Date().toISOString();
}

function getSeverityColors(severity?: string) {
  const value = severity?.toLowerCase();

  if (value === "high" || value === "critical") {
    return {
      background: "#fee2e2",
      color: "#b91c1c",
      border: "#fecaca",
    };
  }

  if (value === "medium") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "#fde68a",
    };
  }

  if (value === "low") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "#bbf7d0",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
    border: "#e5e7eb",
  };
}

function getPriorityColors(priority?: string) {
  const value = priority?.toLowerCase();

  if (value === "p1" || value === "urgent" || value === "high") {
    return {
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (value === "p2" || value === "medium") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (value === "p3" || value === "low") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

function getStatusColors(status?: string) {
  const value = status?.toLowerCase();

  if (value === "closed" || value === "resolved") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (value === "abandoned") {
    return {
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  return {
    background: "#f3f4f6",
    color: "#374151",
  };
}

export function ClosedFaultsPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const filteredFaults = useMemo(() => {
    if (!siteFile) return [];

    const q = search.trim().toLowerCase();
    if (!q) {
      return [...siteFile.closedFaults].sort((a, b) =>
        (b.resolvedAt ?? b.updatedAt ?? "").localeCompare(a.resolvedAt ?? a.updatedAt ?? "")
      );
    }

    return [...siteFile.closedFaults]
      .filter((fault) => {
        const systemName = fault.systemId
          ? siteFile.systems.find((s) => s.id === fault.systemId)?.name
          : "";

        const haystack = [
          fault.title,
          fault.category,
          fault.severity,
          fault.priority,
          fault.status,
          fault.deviceId,
          fault.location?.locationText,
          fault.location?.level,
          fault.location?.room,
          fault.symptom?.summary,
          fault.rootCause?.summary,
          fault.notes,
          systemName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) =>
        (b.resolvedAt ?? b.updatedAt ?? "").localeCompare(a.resolvedAt ?? a.updatedAt ?? "")
      );
  }, [siteFile, search]);

  const persistSiteFile = async (next: SiteFile) => {
    setSaving(true);
    try {
      await updateSite(
        cleanFirestoreData({
          ...next,
          metadata: {
            ...next.metadata,
            updatedAt: nowIso(),
          },
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReopenFault = async (faultId: string) => {
    if (!siteFile) return;

    const confirmed = window.confirm(
      "Reopen this fault and move it back to the open faults register?"
    );
    if (!confirmed) return;

    try {
      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const fault = next.closedFaults.find((item: FaultRecord) => item.id === faultId);
      if (!fault) return;

      const reopened: FaultRecord = {
        ...fault,
        status: "open",
        resolvedAt: undefined,
        updatedAt: nowIso(),
      };

      next.closedFaults = next.closedFaults.filter((item: FaultRecord) => item.id !== faultId);
      next.openFaults.unshift(reopened);

      await persistSiteFile(next);
      setMessages([`Fault "${fault.title}" reopened.`]);
    } catch (reopenError) {
      setMessages([
        reopenError instanceof Error ? reopenError.message : "Failed to reopen fault.",
      ]);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading closed faults">
        <Card>Loading closed faults...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Closed faults error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile) {
    return (
      <AppLayout title="Closed faults not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Closed Faults"
      subtitle={`${siteFile.site.name} • ${siteFile.closedFaults.length} closed`}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroWrapStyle}>
            <div>
              <div style={eyebrowStyle}>FAULT HISTORY</div>
              <div style={heroTitleStyle}>Closed / Resolved Faults</div>
              <div style={heroSubStyle}>
                Review resolved issues, confirm resolution trail, and reopen faults if needed.
              </div>
            </div>

            <div style={heroBadgeStyle}>{siteFile.closedFaults.length} Closed</div>
          </div>
        </Card>

        <Card>
          <CardTitle>Controls</CardTitle>

          <div style={{ display: "grid", gap: "12px" }}>
            <Field label="Search Closed Faults">
              <input
                type="text"
                placeholder="Title, severity, system, location, symptom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <div style={twoColStyle}>
              <SecondaryButton
                onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/faults/open`)}
              >
                Open Faults
              </SecondaryButton>

              <SecondaryButton
                onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/overview`)}
              >
                Back to Overview
              </SecondaryButton>
            </div>

            {saving ? <div style={savingTextStyle}>Saving…</div> : null}
          </div>
        </Card>

        {messages.length > 0 && (
          <Card>
            <CardTitle>Messages</CardTitle>
            <div style={messageListStyle}>
              {messages.map((message, index) => (
                <div key={`${message}-${index}`}>{message}</div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <CardTitle>Closed Fault Register</CardTitle>

          {filteredFaults.length === 0 ? (
            <p style={emptyTextStyle}>No closed faults found.</p>
          ) : (
            <div style={faultGridStyle}>
              {filteredFaults.map((fault) => {
                const systemName = fault.systemId
                  ? siteFile.systems.find((s) => s.id === fault.systemId)?.name
                  : undefined;

                const severityColors = getSeverityColors(fault.severity);
                const priorityColors = getPriorityColors(fault.priority);
                const statusColors = getStatusColors(fault.status);

                return (
                  <div
                    key={fault.id}
                    style={{
                      ...faultCardStyle,
                      borderColor: severityColors.border,
                    }}
                  >
                    <div style={faultTopRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div style={faultTitleStyle}>{fault.title}</div>
                        <div style={faultSubTitleStyle}>
                          {fault.deviceId ?? "No device ref"} •{" "}
                          {fault.location?.locationText ?? "No location"}
                        </div>
                      </div>

                      <div style={faultBadgeGroupStyle}>
                        <span
                          style={{
                            ...badgeStyle,
                            background: statusColors.background,
                            color: statusColors.color,
                          }}
                        >
                          {fault.status ?? "closed"}
                        </span>

                        <span
                          style={{
                            ...badgeStyle,
                            background: severityColors.background,
                            color: severityColors.color,
                          }}
                        >
                          {fault.severity ?? "—"}
                        </span>

                        <span
                          style={{
                            ...badgeStyle,
                            background: priorityColors.background,
                            color: priorityColors.color,
                          }}
                        >
                          {fault.priority ?? "—"}
                        </span>
                      </div>
                    </div>

                    <div style={faultInfoGridStyle}>
                      <div>
                        <strong>Category:</strong> {fault.category ?? "—"}
                      </div>
                      <div>
                        <strong>System:</strong> {systemName ?? "—"}
                      </div>
                      <div>
                        <strong>Opened:</strong>{" "}
                        {fault.firstObservedAt
                          ? formatIrishDateTime(fault.firstObservedAt)
                          : "—"}
                      </div>
                      <div>
                        <strong>Resolved:</strong>{" "}
                        {fault.resolvedAt
                          ? formatIrishDateTime(fault.resolvedAt)
                          : fault.updatedAt
                            ? formatIrishDateTime(fault.updatedAt)
                            : "—"}
                      </div>
                    </div>

                    <div style={timelineCardStyle}>
                      <div style={timelineTitleStyle}>Resolution Trail</div>
                      <div style={timelineLineStyle}>
                        Reported{" "}
                        {fault.firstObservedAt
                          ? formatIrishDate(fault.firstObservedAt)
                          : "—"}
                      </div>
                      <div style={timelineLineStyle}>
                        Last updated{" "}
                        {fault.updatedAt ? formatIrishDateTime(fault.updatedAt) : "—"}
                      </div>
                      <div style={timelineLineStyle}>
                        Closed{" "}
                        {fault.resolvedAt ? formatIrishDateTime(fault.resolvedAt) : "—"}
                      </div>
                    </div>

                    {fault.symptom?.summary ? (
                      <div style={faultTextBlockStyle}>
                        <div style={faultTextLabelStyle}>Symptom</div>
                        <div style={faultTextValueStyle}>{fault.symptom.summary}</div>
                      </div>
                    ) : null}

                    {fault.rootCause?.summary ? (
                      <div style={faultTextBlockStyle}>
                        <div style={faultTextLabelStyle}>Cause / Resolution</div>
                        <div style={faultTextValueStyle}>{fault.rootCause.summary}</div>
                      </div>
                    ) : null}

                    {fault.notes ? (
                      <div style={faultTextBlockStyle}>
                        <div style={faultTextLabelStyle}>Notes</div>
                        <div style={faultTextValueStyle}>{fault.notes}</div>
                      </div>
                    ) : null}

                    <div style={faultActionsStyle}>
                      <SecondaryButton
                        onClick={() =>
                          navigate(`/site/${siteFile.metadata.siteFileId}/visit/new`)
                        }
                        disabled={saving}
                      >
                        New Visit
                      </SecondaryButton>

                      <PrimaryButton
                        onClick={() => handleReopenFault(fault.id)}
                        disabled={saving}
                      >
                        Reopen Fault
                      </PrimaryButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
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
  background: "#dcfce7",
  color: "#166534",
  fontSize: "0.82rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const savingTextStyle: React.CSSProperties = {
  color: "#6b7280",
  fontWeight: 700,
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#92400e",
  fontWeight: 700,
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};

const faultGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "12px",
};

const faultCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  background: "#ffffff",
  display: "grid",
  gap: "12px",
};

const faultTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const faultTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.2,
};

const faultSubTitleStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.9rem",
  marginTop: "4px",
  lineHeight: 1.35,
};

const faultBadgeGroupStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "end",
  gap: "6px",
};

const badgeStyle: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.75rem",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const faultInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "8px 12px",
  color: "#374151",
  fontSize: "0.92rem",
};

const timelineCardStyle: React.CSSProperties = {
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "12px",
  display: "grid",
  gap: "6px",
};

const timelineTitleStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "2px",
};

const timelineLineStyle: React.CSSProperties = {
  color: "#374151",
  fontSize: "0.9rem",
  lineHeight: 1.35,
};

const faultTextBlockStyle: React.CSSProperties = {
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "12px",
};

const faultTextLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

const faultTextValueStyle: React.CSSProperties = {
  color: "#111827",
  lineHeight: 1.45,
  fontSize: "0.94rem",
};

const faultActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};
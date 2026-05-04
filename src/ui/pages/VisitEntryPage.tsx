import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/context/AuthContext";

import type { SiteFile, VisitRecord } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";

import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  Field,
  PrimaryButton,
  SecondaryButton,
  inputStyle as baseInputStyle,
  textareaStyle as baseTextareaStyle,
} from "../components/ui";
import { formatIrishDateTime } from "../utils/dateTime";
import { AddPartActionModal } from "../components/AddPartActionModal";

/* ---------------- helpers ---------------- */

function nowIso() {
  return new Date().toISOString();
}

function formatElapsed(startedAt?: string): string {
  if (!startedAt) return "00:00:00";

  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function toVisitTypeLabel(value?: string) {
  if (!value) return "Visit";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* ---------------- component ---------------- */

export function VisitEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { visitId } = useParams<{ visitId: string }>();

  const { user } = useAuth();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();

  const routeVisit = (location.state as { visit?: VisitRecord } | null)?.visit;

  const existingVisit = useMemo(() => {
    if (!siteFile || !visitId) return undefined;
    return siteFile.visits.find((v) => v.id === visitId);
  }, [siteFile, visitId]);

  const visit = existingVisit ?? routeVisit;
  const isHydrating = !!visitId && !visit;

  const [form, setForm] = useState({
    engineerName: "",
    visitType: "routine-service" as VisitRecord["visitType"],
    status: "in-progress" as VisitRecord["status"],
    discipline: "fire-alarm" as VisitRecord["discipline"],
    systemStatus: "unknown" as VisitRecord["systemStatus"],
    serviceColumnKey: "",
    workCarriedOut: "",
  });

  const [elapsed, setElapsed] = useState("00:00:00");
  const [saving, setSaving] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  /* ---------------- hydrate ---------------- */

  useEffect(() => {
    if (!siteFile || !visit) return;

    setForm({
      engineerName: visit.engineerName || user?.displayName || user?.email || "",
      visitType: visit.visitType ?? "routine-service",
      status:
        visit.status === "draft"
          ? "in-progress"
          : visit.status ?? "in-progress",
      discipline: visit.discipline ?? "fire-alarm",
      systemStatus: visit.systemStatus ?? "unknown",
      serviceColumnKey:
        visit.serviceColumnKey ?? siteFile.serviceLayout.columns[0]?.key ?? "",
      workCarriedOut: visit.workCarriedOut ?? "",
    });
  }, [visit, siteFile, user]);

  useEffect(() => {
    if (!visit?.startedAt) {
      setElapsed("00:00:00");
      return;
    }

    const update = () => {
      setElapsed(formatElapsed(visit.startedAt));
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [visit?.startedAt]);

  /* ---------------- persist ---------------- */

  const persistVisit = async (status: VisitRecord["status"]) => {
    if (!siteFile || !visit) return;

    const next: SiteFile = JSON.parse(JSON.stringify(siteFile));

    const updated: VisitRecord = {
      ...visit,
      ...form,
      status,
      updatedAt: nowIso(),
      completedAt: status === "completed" ? nowIso() : undefined,
    };

    const index = next.visits.findIndex((v) => v.id === updated.id);

    if (index >= 0) {
      next.visits[index] = updated;
    } else {
      next.visits.unshift(updated);
    }

    next.metadata.updatedAt = nowIso();

    setSaving(true);
    try {
      await updateSite(cleanFirestoreData(next));
    } finally {
      setSaving(false);
    }

    return updated;
  };

  /* ---------------- actions ---------------- */

  const handleSaveProgress = async () => {
    if (!visit) return;

    try {
      await persistVisit("in-progress");
      setMessages(["Progress saved."]);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to save progress.",
      ]);
    }
  };

  const handleComplete = async () => {
    if (form.status !== "in-progress") {
      setMessages(["Visit must be in progress before completing."]);
      return;
    }

    try {
      await persistVisit("completed");
      setMessages(["Visit completed."]);
      navigate(`/site/${siteFile?.metadata.siteFileId}/overview`);
    } catch (saveError) {
      setMessages([
        saveError instanceof Error ? saveError.message : "Failed to complete visit.",
      ]);
    }
  };

  /* ---------------- loading states ---------------- */

  if (loading) {
    return (
      <AppLayout title="Loading">
        <Card>Loading…</Card>
      </AppLayout>
    );
  }

  if (error || !siteFile) {
    return (
      <AppLayout title="Error">
        <Card>{error || "Site not found"}</Card>
      </AppLayout>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <AppLayout
      title="Visit Control"
      subtitle={siteFile.site.name}
      sessionStatus={{
        isVisitActive: !!visit && form.status === "in-progress",
        visitLabel: form.visitType,
        engineerName: form.engineerName,
        startedAt: visit?.startedAt,
        serviceColumnLabel: form.serviceColumnKey?.toUpperCase(),
      }}
    >
      <div style={pageGridStyle}>
        {isHydrating && (
          <Card>
            <CardTitle>Opening Visit…</CardTitle>
            <p style={plainTextStyle}>Syncing visit data…</p>
          </Card>
        )}

        {!isHydrating && visit && (
          <>
            <Card>
              <div style={heroShellStyle}>
                <div style={heroTopRowStyle}>
                  <div>
                    <div style={heroEyebrowStyle}>LIVE JOB CONTROL</div>
                    <div style={heroTitleStyle}>{toVisitTypeLabel(form.visitType)}</div>
                    <div style={heroSubStyle}>
                      {form.engineerName || "Engineer"} •{" "}
                      {form.serviceColumnKey
                        ? form.serviceColumnKey.toUpperCase()
                        : "No service column"}
                    </div>
                  </div>

                  <div style={heroBadgeStyle}>● LIVE</div>
                </div>

                <div style={heroInfoGridStyle}>
                  <div style={heroInfoCardStyle}>
                    <div style={heroInfoLabelStyle}>Started</div>
                    <div style={heroInfoValueStyle}>
                      {visit.startedAt ? formatIrishDateTime(visit.startedAt) : "—"}
                    </div>
                  </div>

                  <div style={heroInfoCardStyle}>
                    <div style={heroInfoLabelStyle}>Elapsed</div>
                    <div style={heroInfoValueStyle}>{elapsed}</div>
                  </div>

                  <div style={heroInfoCardStyle}>
                    <div style={heroInfoLabelStyle}>Discipline</div>
                    <div style={heroInfoValueStyle}>{form.discipline}</div>
                  </div>

                  <div style={heroInfoCardStyle}>
                    <div style={heroInfoLabelStyle}>Status</div>
                    <div style={heroInfoValueStyle}>{form.status}</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle>Job Status</CardTitle>

              <div style={sectionGridStyle}>
                <Field label="Engineer">
                  <input value={form.engineerName} disabled style={inputStyle} />
                </Field>

                <Field label="System Status">
                  <select
                    value={form.systemStatus}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        systemStatus: e.target.value as VisitRecord["systemStatus"],
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="normal">Normal</option>
                    <option value="faulted">Faulted</option>
                    <option value="partially-faulted">Partially Faulted</option>
                    <option value="disabled">Disabled</option>
                    <option value="partially-disabled">Partially Disabled</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </Field>
              </div>

              <div style={quickNavGridStyle}>
                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/service`)}
                  style={navButtonStyle}
                >
                  Go to Service
                </SecondaryButton>

                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/faults/open`)}
                  style={navButtonStyle}
                >
                  Go to Faults
                </SecondaryButton>

                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/assets`)}
                  style={navButtonStyle}
                >
                  Open Assets
                </SecondaryButton>

                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/parts`)}
                  style={navButtonStyle}
                >
                  Open Parts
                </SecondaryButton>

                <PrimaryButton
                  onClick={() => setShowPartsModal(true)}
                  style={navButtonStyle}
                >
                  Add Parts
                </PrimaryButton>

                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFile.metadata.siteFileId}/reports`)}
                  style={navButtonStyle}
                >
                  Open Reports
                </SecondaryButton>
              </div>
            </Card>

            <Card>
              <CardTitle>Engineer Notes</CardTitle>

              <Field label="Work Carried Out">
                <textarea
                  value={form.workCarriedOut}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      workCarriedOut: e.target.value,
                    }))
                  }
                  placeholder="What was done on this visit?"
                  style={textareaStyle}
                />
              </Field>
            </Card>

            <Card>
              <CardTitle>Visit Actions</CardTitle>

              <div style={actionsGridStyle}>
                <SecondaryButton
                  onClick={handleSaveProgress}
                  disabled={saving}
                  style={actionButtonStyle}
                >
                  {saving ? "Saving..." : "Save Progress"}
                </SecondaryButton>

                <PrimaryButton
                  onClick={handleComplete}
                  disabled={saving}
                  style={actionButtonStyle}
                >
                  Complete Visit
                </PrimaryButton>
              </div>
            </Card>
          </>
        )}

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
      </div>

      {showPartsModal && visit ? (
        <AddPartActionModal
          siteFile={siteFile}
          activeVisit={visit}
          updateSite={updateSite}
          onClose={() => setShowPartsModal(false)}
          onSaved={() => {
            setShowPartsModal(false);
            setMessages(["Part action saved to this live visit."]);
          }}
        />
      ) : null}
    </AppLayout>
  );
}

/* ---------------- styles ---------------- */

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const plainTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};

const heroShellStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e3a8a 100%)",
  color: "#f8fafc",
  boxShadow: "0 18px 28px rgba(15,23,42,0.18)",
};

const heroTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "12px",
};

const heroEyebrowStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  fontWeight: 800,
  letterSpacing: "0.1em",
  color: "#93c5fd",
  marginBottom: "6px",
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: "1.45rem",
  fontWeight: 800,
  lineHeight: 1.1,
};

const heroSubStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#cbd5e1",
  fontSize: "0.95rem",
};

const heroBadgeStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(34,197,94,0.16)",
  border: "1px solid rgba(34,197,94,0.24)",
  color: "#dcfce7",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const heroInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const heroInfoCardStyle: React.CSSProperties = {
  padding: "12px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(148,163,184,0.18)",
};

const heroInfoLabelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "#93c5fd",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const heroInfoValueStyle: React.CSSProperties = {
  fontSize: "0.98rem",
  fontWeight: 700,
  color: "#f8fafc",
  lineHeight: 1.35,
};

const sectionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const quickNavGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
};

const actionsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const navButtonStyle: React.CSSProperties = {
  minHeight: "52px",
};

const actionButtonStyle: React.CSSProperties = {
  minHeight: "56px",
  fontWeight: 800,
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#1e3a8a",
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  ...baseInputStyle,
  minHeight: "52px",
  borderRadius: "14px",
};

const textareaStyle: React.CSSProperties = {
  ...baseTextareaStyle,
  minHeight: "140px",
  borderRadius: "14px",
};
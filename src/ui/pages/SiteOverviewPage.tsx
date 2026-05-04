import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SiteFile, VisitRecord } from "../../core";
import { getSiteFileSummaryReport } from "../../core";
import { useFirestoreSite } from "../../app/state/useFirestoreSite";
import { useAuth } from "../../app/context/AuthContext";
import { cleanFirestoreData } from "../../utils/cleanFirestoreData";
import { AppLayout } from "../layouts/AppLayout";
import {
  Card,
  CardTitle,
  PrimaryButton,
  SecondaryButton,
} from "../components/ui";
import { formatIrishDate, formatIrishDateTime } from "../utils/dateTime";

type VisitStartType =
  | "routine-service"
  | "fault-visit"
  | "reactive-callout"
  | "inspection"
  | "small-works";

type DisciplineOption =
  | "fire-alarm"
  | "intruder-alarm"
  | "cctv"
  | "access-control"
  | "emergency-lighting";

const DISCIPLINE_LABELS: Record<DisciplineOption, string> = {
  "fire-alarm": "Fire",
  "intruder-alarm": "Intruder",
  cctv: "CCTV",
  "access-control": "Access",
  "emergency-lighting": "E-Lighting",
};

function makeId(prefix = "id"): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function getEngineerNameFromUser(
  user: { displayName?: string | null; email?: string | null } | null
): string {
  if (!user) return "";
  if (user.displayName?.trim()) return user.displayName.trim();
  if (user.email?.trim()) return user.email.split("@")[0];
  return "";
}

export function SiteOverviewPage() {
  const navigate = useNavigate();
  const { siteFile, updateSite, loading, error } = useFirestoreSite();
  const { user } = useAuth();

  const [visitType, setVisitType] = useState<VisitStartType>("routine-service");
  const [selectedDisciplines, setSelectedDisciplines] = useState<DisciplineOption[]>([
    "fire-alarm",
  ]);
  const [selectedServiceColumnKey, setSelectedServiceColumnKey] = useState("");
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [elapsed, setElapsed] = useState("00:00:00");
  const [startingVisit, setStartingVisit] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [showEndJobModal, setShowEndJobModal] = useState(false);

  const currentServiceColumnKey = siteFile?.serviceLayout.columns[0]?.key ?? "";

  const summary = useMemo(() => {
    if (!siteFile) return undefined;
    return getSiteFileSummaryReport(siteFile, {
      currentServiceColumnKey,
    });
  }, [siteFile, currentServiceColumnKey]);

  const completedServiceKeys = useMemo(() => {
    if (!siteFile) return new Set<string>();

    return new Set(
      siteFile.visits
        .filter(
          (visit) =>
            (visit.status === "completed" || visit.status === "exported") &&
            !!visit.serviceColumnKey
        )
        .map((visit) => visit.serviceColumnKey as string)
    );
  }, [siteFile]);

  const availableServiceColumns = useMemo(() => {
    if (!siteFile) return [];
    return siteFile.serviceLayout.columns.filter(
      (column) => !completedServiceKeys.has(column.key)
    );
  }, [siteFile, completedServiceKeys]);

  const recentVisit = useMemo(() => {
    return summary?.recentVisits?.[0];
  }, [summary]);

  const activeVisit = useMemo(() => {
    if (!siteFile) return undefined;
    return [...siteFile.visits]
      .filter((visit) => visit.status === "draft" || visit.status === "in-progress")
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
  }, [siteFile]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!activeVisit?.startedAt) {
      setElapsed("00:00:00");
      return;
    }

    const updateElapsed = () => {
      setElapsed(formatElapsed(activeVisit.startedAt));
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(interval);
  }, [activeVisit?.startedAt]);

  const toggleDiscipline = (discipline: DisciplineOption) => {
    setSelectedDisciplines((prev) => {
      if (prev.includes(discipline)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== discipline);
      }
      return [...prev, discipline];
    });
  };

  const handleStartVisit = async () => {
    if (!siteFile) return;

    if (activeVisit) {
      navigate(`/site/${siteFile.metadata.siteFileId}/visit/${activeVisit.id}`, {
        state: { visit: activeVisit },
      });
      return;
    }

    if (
      visitType === "routine-service" &&
      availableServiceColumns.length > 0 &&
      !selectedServiceColumnKey
    ) {
      setMessages(["Please select the service quarter / column before starting the visit."]);
      return;
    }

    const engineerName = getEngineerNameFromUser(user);
    if (!engineerName) {
      setMessages(["Could not determine engineer name from login."]);
      return;
    }

    try {
      setStartingVisit(true);
      setMessages([]);

      const now = nowIso();

      const newVisit: VisitRecord = {
        id: makeId("visit"),
        siteId: siteFile.site.id,
        startedAt: now,
        engineerName,
        visitType,
        status: "in-progress",
        discipline: (selectedDisciplines[0] as VisitRecord["discipline"]) ?? "fire-alarm",
        systemStatus: "unknown",
        photoIds: [],
        faultIds: [],
        complianceIds: [],
        replacementIds: [],
        systemIds: [],
        serviceColumnKey:
          visitType === "routine-service" ? selectedServiceColumnKey || undefined : undefined,
        exportPdfCreated: "no",
        createdAt: now,
        updatedAt: now,
      };

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      next.visits.unshift(newVisit);
      next.metadata.updatedAt = now;

      await updateSite(cleanFirestoreData(next));

      navigate(`/site/${siteFile.metadata.siteFileId}/visit/${newVisit.id}`, {
        state: { visit: newVisit },
      });
    } catch (startError) {
      setMessages([
        startError instanceof Error ? startError.message : "Failed to start visit.",
      ]);
    } finally {
      setStartingVisit(false);
    }
  };

  const handleContinueJob = () => {
    if (!siteFile || !activeVisit) return;
    navigate(`/site/${siteFile.metadata.siteFileId}/visit/${activeVisit.id}`, {
      state: { visit: activeVisit },
    });
  };

  const handleConfirmEndJob = async () => {
    if (!siteFile || !activeVisit) return;

    try {
      setStartingVisit(true);

      const next: SiteFile = JSON.parse(JSON.stringify(siteFile));
      const index = next.visits.findIndex((visit) => visit.id === activeVisit.id);
      if (index < 0) return;

      next.visits[index] = {
        ...next.visits[index],
        status: "completed",
        completedAt: nowIso(),
        updatedAt: nowIso(),
      };

      next.metadata.updatedAt = nowIso();

      await updateSite(cleanFirestoreData(next));
      setMessages(["Job ended and visit completed."]);
      setShowEndJobModal(false);
    } catch (endError) {
      setMessages([
        endError instanceof Error ? endError.message : "Failed to end active job.",
      ]);
    } finally {
      setStartingVisit(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading site">
        <Card>Loading site...</Card>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Site error">
        <Card>{error}</Card>
      </AppLayout>
    );
  }

  if (!siteFile || !summary) {
    return (
      <AppLayout title="Site not found">
        <Card>
          <p style={{ marginTop: 0 }}>The requested site could not be found.</p>
          <SecondaryButton onClick={() => navigate("/")}>Back to Sites</SecondaryButton>
        </Card>
      </AppLayout>
    );
  }

  const siteFileId = siteFile.metadata.siteFileId;
  const engineerName = getEngineerNameFromUser(user);

  const openFaultCount = summary.headline.openFaultsCount ?? 0;
  const visitsCount = summary.headline.visitsCount ?? 0;
  const assetsCount = summary.headline.assetsCount ?? 0;
  const reportsCount = summary.headline.exportedReportsCount ?? 0;
  const installedPartsCount = ((siteFile as any).installedParts ?? []).length;

  return (
    <AppLayout
      title={summary.headline.siteName}
      subtitle={`Ref: ${summary.headline.siteReference ?? "—"}`}
      sessionStatus={{
        isVisitActive: !!activeVisit,
        visitLabel: activeVisit?.visitType,
        engineerName: activeVisit?.engineerName ?? engineerName,
        startedAt: activeVisit?.startedAt,
        serviceColumnLabel: activeVisit?.serviceColumnKey?.toUpperCase(),
      }}
    >
      <div style={pageGridStyle}>
        <Card>
          <div style={heroShellStyle}>
            <div style={heroGlowStyle} />
            <div style={heroContentStyle}>
              <div style={{ minWidth: 0 }}>
                <div style={heroEyebrowStyle}>SITE CONTROL</div>
                <div style={heroTitleStyle}>{summary.headline.siteName}</div>
                <div style={heroSubStyle}>
                  {summary.headline.address ?? "No address recorded"}
                </div>

                <div style={heroMetaWrapStyle}>
                  <span style={heroMetaPillStyle}>
                    {summary.headline.siteReference ?? "No reference"}
                  </span>
                  <span style={heroMetaPillStyle}>
                    Maintained By: {summary.headline.maintainedBy ?? "—"}
                  </span>
                  <span style={heroMetaPillStyle}>
                    Engineer: {engineerName || "—"}
                  </span>
                </div>
              </div>

              <div style={heroRightStackStyle}>
                <div style={isOnline ? onlineChipStyle : offlineChipStyle}>
                  <span style={isOnline ? onlineDotStyle : offlineDotStyle} />
                  {isOnline ? "Online" : "Offline"}
                </div>

                {activeVisit ? (
                  <div style={activeMiniPanelStyle}>
                    <div style={activeMiniLabelStyle}>Live Job</div>
                    <div style={activeMiniValueStyle}>{elapsed}</div>
                  </div>
                ) : (
                  <div style={idleMiniPanelStyle}>
                    <div style={activeMiniLabelStyle}>No Active Job</div>
                    <div style={idleMiniValueStyle}>Idle</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {activeVisit ? (
          <Card>
            <CardTitle>Live Job</CardTitle>
            <div style={liveJobPanelStyle}>
              <div>
                <div style={liveJobKickerStyle}>● LIVE JOB</div>
                <div style={liveJobTitleStyle}>
                  {activeVisit.visitType}
                  {activeVisit.serviceColumnKey
                    ? ` • ${activeVisit.serviceColumnKey.toUpperCase()}`
                    : ""}
                </div>
                <div style={liveJobMetaStyle}>
                  {activeVisit.engineerName || "No engineer"} •{" "}
                  {activeVisit.startedAt
                    ? formatIrishDateTime(activeVisit.startedAt)
                    : "—"}{" "}
                  • {elapsed}
                </div>
              </div>

              <div style={liveJobActionsStyle}>
                <PrimaryButton onClick={handleContinueJob} style={liveActionButtonStyle}>
                  Continue Job
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => setShowEndJobModal(true)}
                  style={liveActionButtonStyle}
                >
                  End Job
                </SecondaryButton>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <CardTitle>Start Visit</CardTitle>

            <div style={startVisitGridStyle}>
              <div style={visitStateBannerStyle(false)}>
                <div style={visitStateTitleStyle}>No active visit</div>
                <div style={visitStateSubStyle}>
                  Choose the visit type, disciplines, and quarter below. Press Start Visit to create the live visit immediately.
                </div>
              </div>

              <div style={fieldBlockStyle}>
                <div style={fieldLabelStyle}>Visit Type</div>
                <div style={segmentedWrapStyle}>
                  <SegmentButton
                    active={visitType === "routine-service"}
                    onClick={() => setVisitType("routine-service")}
                  >
                    Service
                  </SegmentButton>
                  <SegmentButton
                    active={visitType === "fault-visit"}
                    onClick={() => setVisitType("fault-visit")}
                  >
                    Fault
                  </SegmentButton>
                  <SegmentButton
                    active={visitType === "reactive-callout"}
                    onClick={() => setVisitType("reactive-callout")}
                  >
                    Call-out
                  </SegmentButton>
                  <SegmentButton
                    active={visitType === "inspection"}
                    onClick={() => setVisitType("inspection")}
                  >
                    Inspect
                  </SegmentButton>
                  <SegmentButton
                    active={visitType === "small-works"}
                    onClick={() => setVisitType("small-works")}
                  >
                    Works
                  </SegmentButton>
                </div>
              </div>

              <div style={fieldBlockStyle}>
                <div style={fieldLabelStyle}>Disciplines</div>
                <div style={segmentedWrapStyle}>
                  {(Object.keys(DISCIPLINE_LABELS) as DisciplineOption[]).map((discipline) => (
                    <SegmentButton
                      key={discipline}
                      active={selectedDisciplines.includes(discipline)}
                      onClick={() => toggleDiscipline(discipline)}
                    >
                      {DISCIPLINE_LABELS[discipline]}
                    </SegmentButton>
                  ))}
                </div>
              </div>

              {visitType === "routine-service" ? (
                <div style={fieldBlockStyle}>
                  <div style={fieldLabelStyle}>Service Quarter / Column</div>

                  {availableServiceColumns.length === 0 ? (
                    <div style={infoPanelStyle}>
                      All current service columns appear completed. Review service data or start a non-service visit instead.
                    </div>
                  ) : (
                    <div style={serviceColumnGridStyle}>
                      {availableServiceColumns.map((column) => {
                        const active = selectedServiceColumnKey === column.key;
                        return (
                          <button
                            key={column.key}
                            type="button"
                            onClick={() => setSelectedServiceColumnKey(column.key)}
                            style={active ? serviceColumnCardActiveStyle : serviceColumnCardStyle}
                          >
                            <div style={serviceColumnTitleStyle}>{column.label}</div>
                            <div style={serviceColumnMetaStyle}>
                              {column.serviceDate ? formatIrishDate(column.serviceDate) : "No date"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              <div style={startVisitActionRowStyle}>
                <PrimaryButton
                  onClick={handleStartVisit}
                  disabled={startingVisit}
                  style={startVisitButtonStyle}
                >
                  {startingVisit ? "Starting..." : "Start Visit"}
                </PrimaryButton>

                <SecondaryButton
                  onClick={() => navigate(`/site/${siteFileId}/site-notes`)}
                  style={startVisitButtonStyle}
                >
                  Review Site Notes
                </SecondaryButton>
              </div>
            </div>
          </Card>
        )}

        {messages.length > 0 ? (
          <Card>
            <CardTitle>Messages</CardTitle>
            <div style={messageListStyle}>
              {messages.map((message, index) => (
                <div key={`${message}-${index}`}>{message}</div>
              ))}
            </div>
          </Card>
        ) : null}

        <div style={kpiGridStyle}>
          <button
            type="button"
            onClick={() => navigate(`/site/${siteFileId}/faults/open`)}
            style={{ ...kpiCardStyle, ...kpiDangerStyle }}
          >
            <div style={kpiIconStyle}>⚠️</div>
            <div style={kpiValueStyle}>{openFaultCount}</div>
            <div style={kpiLabelStyle}>Open Faults</div>
            <div style={kpiHintStyle}>Active issues needing attention</div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/site/${siteFileId}/assets`)}
            style={{ ...kpiCardStyle, ...kpiNeutralStyle }}
          >
            <div style={kpiIconStyle}>📋</div>
            <div style={kpiValueStyle}>{assetsCount}</div>
            <div style={kpiLabelStyle}>Assets</div>
            <div style={kpiHintStyle}>Open the asset register</div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/site/${siteFileId}/service`)}
            style={{ ...kpiCardStyle, ...kpiPrimaryStyle }}
          >
            <div style={kpiIconStyle}>🛠️</div>
            <div style={kpiValueStyle}>{visitsCount}</div>
            <div style={kpiLabelStyle}>Service</div>
            <div style={kpiHintStyle}>Execute and track device testing</div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/site/${siteFileId}/parts`)}
            style={{ ...kpiCardStyle, ...kpiPartsStyle }}
          >
            <div style={kpiIconStyle}>🔩</div>
            <div style={kpiValueStyle}>{installedPartsCount}</div>
            <div style={kpiLabelStyle}>Parts</div>
            <div style={kpiHintStyle}>Installed parts and activity</div>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/site/${siteFileId}/reports`)}
            style={{ ...kpiCardStyle, ...kpiSuccessStyle }}
          >
            <div style={kpiIconStyle}>📄</div>
            <div style={kpiValueStyle}>{reportsCount}</div>
            <div style={kpiLabelStyle}>Reports</div>
            <div style={kpiHintStyle}>Print, review and export</div>
          </button>
        </div>

        <div style={twoCardGridStyle}>
          <Card>
            <CardTitle>Recent Visit</CardTitle>
            {recentVisit ? (
              <div style={summaryCardStyle}>
                <div style={summaryCardTitleStyle}>{recentVisit.visitType}</div>
                <div style={summaryCardMetaStyle}>{recentVisit.engineerName || "No engineer"}</div>
                <div style={summaryCardMetaStyle}>
                  {(recentVisit.completedAt ?? recentVisit.startedAt)
                    ? formatIrishDate(recentVisit.completedAt ?? recentVisit.startedAt)
                    : "—"}
                </div>
                <div style={summaryCardMetaStyle}>
                  {recentVisit.serviceColumnKey
                    ? recentVisit.serviceColumnKey.toUpperCase()
                    : "No service column"}
                </div>

                <div style={{ marginTop: "12px" }}>
                  <SecondaryButton
                    onClick={() =>
                      navigate(`/site/${siteFileId}/visit/${recentVisit.id}`, {
                        state: { visit: recentVisit },
                      })
                    }
                  >
                    Open Visit
                  </SecondaryButton>
                </div>
              </div>
            ) : (
              <p style={emptyTextStyle}>No visits recorded yet.</p>
            )}
          </Card>

          <Card>
            <CardTitle>Quick Actions</CardTitle>
            <div style={quickActionGridStyle}>
              <QuickActionButton
                label="Edit Site"
                icon="✏️"
                onClick={() => navigate(`/site/${siteFileId}/edit`)}
              />
              <QuickActionButton
                label="Site Notes"
                icon="📝"
                onClick={() => navigate(`/site/${siteFileId}/site-notes`)}
              />
              <QuickActionButton
                label="Assets"
                icon="📋"
                onClick={() => navigate(`/site/${siteFileId}/assets`)}
              />
              <QuickActionButton
                label="Parts"
                icon="🔩"
                onClick={() => navigate(`/site/${siteFileId}/parts`)}
              />
              <QuickActionButton
                label="Faults"
                icon="🚨"
                onClick={() => navigate(`/site/${siteFileId}/faults/open`)}
              />
              <QuickActionButton
                label="Closed"
                icon="✅"
                onClick={() => navigate(`/site/${siteFileId}/faults/closed`)}
              />
              <QuickActionButton
                label="Reports"
                icon="🖨️"
                onClick={() => navigate(`/site/${siteFileId}/reports`)}
              />
            </div>
          </Card>
        </div>

        {showEndJobModal && activeVisit ? (
          <div style={modalOverlayStyle}>
            <div style={modalCardStyle}>
              <div style={modalKickerStyle}>END LIVE JOB</div>
              <div style={modalTitleStyle}>Confirm job completion</div>
              <div style={modalTextStyle}>
                This will mark the current live visit as completed.
              </div>

              <div style={modalInfoGridStyle}>
                <div style={modalInfoItemStyle}>
                  <div style={modalInfoLabelStyle}>Visit</div>
                  <div style={modalInfoValueStyle}>{activeVisit.visitType}</div>
                </div>

                <div style={modalInfoItemStyle}>
                  <div style={modalInfoLabelStyle}>Service</div>
                  <div style={modalInfoValueStyle}>
                    {activeVisit.serviceColumnKey?.toUpperCase() ?? "—"}
                  </div>
                </div>

                <div style={modalInfoItemStyle}>
                  <div style={modalInfoLabelStyle}>Engineer</div>
                  <div style={modalInfoValueStyle}>
                    {activeVisit.engineerName || "—"}
                  </div>
                </div>

                <div style={modalInfoItemStyle}>
                  <div style={modalInfoLabelStyle}>Elapsed</div>
                  <div style={modalInfoValueStyle}>{elapsed}</div>
                </div>

                <div style={{ ...modalInfoItemStyle, gridColumn: "1 / -1" }}>
                  <div style={modalInfoLabelStyle}>Started</div>
                  <div style={modalInfoValueStyle}>
                    {activeVisit.startedAt
                      ? formatIrishDateTime(activeVisit.startedAt)
                      : "—"}
                  </div>
                </div>
              </div>

              <div style={modalActionRowStyle}>
                <SecondaryButton
                  onClick={() => setShowEndJobModal(false)}
                  style={modalButtonStyle}
                >
                  Cancel
                </SecondaryButton>

                <PrimaryButton
                  onClick={handleConfirmEndJob}
                  disabled={startingVisit}
                  style={modalButtonStyle}
                >
                  {startingVisit ? "Ending..." : "End Job"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? segmentButtonActiveStyle : segmentButtonStyle}
    >
      {children}
    </button>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={quickActionButtonStyle}>
      <span style={quickActionIconStyle}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const heroShellStyle: React.CSSProperties = {
  position: "relative",
  borderRadius: "22px",
  overflow: "hidden",
  background: "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1e3a8a 100%)",
  boxShadow: "0 20px 36px rgba(15,23,42,0.18)",
};

const heroGlowStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top right, rgba(96,165,250,0.28) 0%, rgba(96,165,250,0) 34%)",
  pointerEvents: "none",
};

const heroContentStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "12px",
  padding: "18px",
};

const heroEyebrowStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.12em",
  color: "#60a5fa",
  marginBottom: "6px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: "0 0 6px 0",
  fontSize: "1.7rem",
  lineHeight: 1.05,
  fontWeight: 800,
  color: "#f8fafc",
};

const heroSubStyle: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "0.95rem",
  lineHeight: 1.45,
  maxWidth: "700px",
};

const heroMetaWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
};

const heroMetaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.08)",
  color: "#e2e8f0",
  fontSize: "0.82rem",
  fontWeight: 700,
  border: "1px solid rgba(148,163,184,0.16)",
};

const heroRightStackStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  justifyItems: "end",
  minWidth: "170px",
};

const onlineChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.22)",
  color: "#dcfce7",
  fontWeight: 800,
};

const offlineChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.22)",
  color: "#fee2e2",
  fontWeight: 800,
};

const onlineDotStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#22c55e",
  boxShadow: "0 0 0 4px rgba(34,197,94,0.18)",
};

const offlineDotStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#ef4444",
  boxShadow: "0 0 0 4px rgba(239,68,68,0.18)",
};

const activeMiniPanelStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(148,163,184,0.16)",
  textAlign: "right",
};

const idleMiniPanelStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(148,163,184,0.12)",
  textAlign: "right",
};

const activeMiniLabelStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 800,
  color: "#93c5fd",
  marginBottom: "4px",
};

const activeMiniValueStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#f8fafc",
};

const idleMiniValueStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#cbd5e1",
};

const liveJobPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #166534 0%, #15803d 100%)",
  color: "#f0fdf4",
  boxShadow: "0 16px 26px rgba(22,101,52,0.18)",
};

const liveJobKickerStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 800,
  letterSpacing: "0.1em",
  color: "#bbf7d0",
  marginBottom: "6px",
};

const liveJobTitleStyle: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 800,
  lineHeight: 1.1,
};

const liveJobMetaStyle: React.CSSProperties = {
  marginTop: "6px",
  color: "#dcfce7",
  lineHeight: 1.45,
  fontSize: "0.95rem",
};

const liveJobActionsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const liveActionButtonStyle: React.CSSProperties = {
  minHeight: "54px",
};

const startVisitGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const visitStateBannerStyle = (_activeVisit: boolean): React.CSSProperties => ({
  padding: "14px",
  borderRadius: "18px",
  background: "linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)",
  border: "1px solid #fca5a5",
});

const visitStateTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  fontSize: "1rem",
  color: "#111827",
};

const visitStateSubStyle: React.CSSProperties = {
  marginTop: "4px",
  color: "#475569",
  lineHeight: 1.45,
};

const fieldBlockStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "0.86rem",
  fontWeight: 800,
  color: "#475569",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const segmentedWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const segmentButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "0.88rem",
  fontWeight: 700,
  cursor: "pointer",
};

const segmentButtonActiveStyle: React.CSSProperties = {
  ...segmentButtonStyle,
  background: "#0f172a",
  color: "#ffffff",
  border: "1px solid #0f172a",
  boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
};

const serviceColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const serviceColumnCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "14px",
  textAlign: "left",
  background: "#ffffff",
  cursor: "pointer",
};

const serviceColumnCardActiveStyle: React.CSSProperties = {
  ...serviceColumnCardStyle,
  border: "1px solid #16a34a",
  background: "#f0fdf4",
  boxShadow: "0 10px 18px rgba(22,163,74,0.12)",
};

const serviceColumnTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
};

const serviceColumnMetaStyle: React.CSSProperties = {
  marginTop: "4px",
  fontSize: "0.9rem",
  color: "#6b7280",
};

const infoPanelStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#475569",
  lineHeight: 1.45,
};

const startVisitActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const startVisitButtonStyle: React.CSSProperties = {
  minHeight: "56px",
  fontSize: "1rem",
  fontWeight: 800,
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: "6px",
  color: "#92400e",
  fontWeight: 700,
};

const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const kpiCardStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "20px",
  padding: "16px 14px",
  minHeight: "122px",
  display: "grid",
  alignContent: "start",
  gap: "6px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(15,23,42,0.10)",
};

const kpiDangerStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #fff5f5 0%, #fee2e2 100%)",
  color: "#7f1d1d",
};

const kpiPrimaryStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
  color: "#1d4ed8",
};

const kpiSuccessStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
  color: "#166534",
};

const kpiNeutralStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #f8fafc 0%, #e5e7eb 100%)",
  color: "#111827",
};

const kpiPartsStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
  color: "#9a3412",
};

const kpiIconStyle: React.CSSProperties = {
  fontSize: "1.2rem",
  lineHeight: 1,
};

const kpiValueStyle: React.CSSProperties = {
  fontSize: "1.8rem",
  fontWeight: 800,
  lineHeight: 1,
};

const kpiLabelStyle: React.CSSProperties = {
  fontSize: "0.98rem",
  fontWeight: 700,
};

const kpiHintStyle: React.CSSProperties = {
  fontSize: "0.82rem",
  opacity: 0.86,
};

const twoCardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const summaryCardStyle: React.CSSProperties = {
  padding: "14px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const summaryCardTitleStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#111827",
  marginBottom: "6px",
};

const summaryCardMetaStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "0.92rem",
  marginTop: "2px",
};

const quickActionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const quickActionButtonStyle: React.CSSProperties = {
  minHeight: "70px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: "12px",
  display: "grid",
  gap: "6px",
  justifyItems: "start",
  alignContent: "center",
  textAlign: "left",
  fontWeight: 700,
  color: "#111827",
  cursor: "pointer",
};

const quickActionIconStyle: React.CSSProperties = {
  fontSize: "1rem",
};

const emptyTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,0.66)",
  backdropFilter: "blur(6px)",
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const modalCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "560px",
  borderRadius: "24px",
  background: "#ffffff",
  padding: "20px",
  boxShadow: "0 28px 60px rgba(2,6,23,0.32)",
  display: "grid",
  gap: "14px",
};

const modalKickerStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  fontWeight: 800,
  letterSpacing: "0.1em",
  color: "#b91c1c",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.1,
};

const modalTextStyle: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
};

const modalInfoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const modalInfoItemStyle: React.CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "12px",
};

const modalInfoLabelStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#64748b",
  marginBottom: "6px",
};

const modalInfoValueStyle: React.CSSProperties = {
  fontSize: "0.98rem",
  fontWeight: 700,
  color: "#111827",
  lineHeight: 1.35,
};

const modalActionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginTop: "4px",
};

const modalButtonStyle: React.CSSProperties = {
  minHeight: "54px",
};
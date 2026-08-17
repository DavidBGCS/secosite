// src/ui/pages/SiteOverviewPage.tsx

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

  const openFaultCount = summary.headline.openFaultsCount ?? 0;
  const visitsCount = summary.headline.visitsCount ?? 0;
  const assetsCount = summary.headline.assetsCount ?? 0;
  const reportsCount = summary.headline.exportedReportsCount ?? 0;
  const installedPartsCount = ((siteFile as any).installedParts ?? []).length;

  return (
    <AppLayout
      title={summary.headline.siteName}
      subtitle={`Ref: ${summary.headline.siteReference ?? "—"}`}
    >
      <div style={pageGridStyle}>

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

          <button
            type="button"
            onClick={() => navigate(`/site/${siteFileId}/test-mode`)}
            style={{
              ...kpiCardStyle,
              background: "linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%)",
              color: "#5b21b6",
            }}
          >
            <div style={kpiIconStyle}>🎤</div>
            <div style={kpiValueStyle}>LIVE</div>
            <div style={kpiLabelStyle}>Test Mode</div>
            <div style={kpiHintStyle}>
              Voice guided walk test mode
            </div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

/* ---------------- styles ---------------- */

const pageGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
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
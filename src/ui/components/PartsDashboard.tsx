import type { CSSProperties, ReactNode } from "react";
import type {
  InstalledPartRecord,
  PartActionRecord,
  PartDiscipline,
} from "../../core/types/parts";
import { formatIrishDateTime } from "../utils/dateTime";

type Props = {
  installedParts?: InstalledPartRecord[];
  partActions?: PartActionRecord[];
  activeVisitId?: string;
};

const DISCIPLINE_LABELS: Record<PartDiscipline, string> = {
  "fire-alarm": "Fire Alarm",
  "intruder-alarm": "Intruder",
  cctv: "CCTV",
  "access-control": "Access",
  "emergency-lighting": "Emergency Lighting",
};

function quantityTotal(items: Array<{ quantity?: number }>) {
  return items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
}

function actionLabel(value?: string) {
  if (!value) return "Action";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function groupByQuantity<T extends string>(
  actions: PartActionRecord[],
  getKey: (action: PartActionRecord) => T
) {
  return Object.entries(
    actions.reduce<Record<string, number>>((acc, action) => {
      const key = getKey(action) || "Unknown";
      acc[key] = (acc[key] ?? 0) + (action.quantity ?? 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
}

function getActionTone(actionType?: string): CSSProperties {
  if (actionType === "add" || actionType === "replace") {
    return { background: "#dcfce7", color: "#166534" };
  }

  if (actionType === "temporary-add") {
    return { background: "#fef3c7", color: "#92400e" };
  }

  if (actionType === "remove" || actionType === "return") {
    return { background: "#fee2e2", color: "#991b1b" };
  }

  return { background: "#dbeafe", color: "#1d4ed8" };
}

function getActionTitleColour(actionType?: string) {
  if (actionType === "add" || actionType === "replace") return "#166534";
  if (actionType === "temporary-add") return "#92400e";
  if (actionType === "remove" || actionType === "return") return "#991b1b";
  return "#111827";
}

export function PartsDashboard({
  installedParts = [],
  partActions = [],
  activeVisitId,
}: Props) {
  const activeVisitActions = activeVisitId
    ? partActions.filter((action) => action.visitId === activeVisitId)
    : [];

  const installedQuantity = quantityTotal(installedParts);
  const visitQuantity = quantityTotal(activeVisitActions);

  const activeDisciplines = new Set(
    partActions.map((action) => action.discipline).filter(Boolean)
  ).size;

  const byDiscipline = groupByQuantity(partActions, (action) => action.discipline);
  const byEngineer = groupByQuantity(
    partActions,
    (action) => action.engineerName || "Unknown"
  );

  const recentActions = [...partActions]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 6);

  return (
    <div style={wrapStyle}>
      <div style={kpiGridStyle}>
        <KpiCard
          label="Installed Parts"
          value={installedParts.length}
          hint="Distinct fitted part records"
          tone="blue"
        />

        <KpiCard
          label="Total Quantity"
          value={installedQuantity}
          hint="Total parts fitted on site"
          tone="orange"
        />

        <KpiCard
          label="Part Actions"
          value={partActions.length}
          hint="Add / replace / remove log"
          tone="slate"
        />

        <KpiCard
          label="Disciplines"
          value={activeDisciplines}
          hint="Disciplines with activity"
          tone="green"
        />
      </div>

      {activeVisitId ? (
        <div style={visitCardStyle}>
          <div style={sectionKickerStyle}>ACTIVE VISIT PARTS</div>
          <div style={visitTitleStyle}>{visitQuantity} parts logged on this visit</div>
          <div style={visitSubStyle}>
            {activeVisitActions.length} action
            {activeVisitActions.length === 1 ? "" : "s"} linked to the live job.
          </div>
        </div>
      ) : null}

      <div style={panelGridStyle}>
        <Panel title="By Discipline">
          {byDiscipline.length === 0 ? (
            <EmptyText />
          ) : (
            byDiscipline.map(([discipline, quantity]) => (
              <MetricRow
                key={discipline}
                label={DISCIPLINE_LABELS[discipline as PartDiscipline] ?? discipline}
                value={quantity}
              />
            ))
          )}
        </Panel>

        <Panel title="By Engineer">
          {byEngineer.length === 0 ? (
            <EmptyText />
          ) : (
            byEngineer.map(([engineer, quantity]) => (
              <MetricRow key={engineer} label={engineer} value={quantity} />
            ))
          )}
        </Panel>
      </div>

      <Panel title="Recent Part Activity">
        {recentActions.length === 0 ? (
          <EmptyText />
        ) : (
          <div style={activityGridStyle}>
            {recentActions.map((action) => (
              <div key={action.id} style={activityCardStyle}>
                <div style={activityTopStyle}>
                  <div>
                    <div
                      style={{
                        ...activityTitleStyle,
                        color: getActionTitleColour(action.actionType),
                      }}
                    >
                      {action.title}
                    </div>

                    <div style={activityMetaStyle}>
                      {action.engineerName || "Unknown"} •{" "}
                      {DISCIPLINE_LABELS[action.discipline] ?? action.discipline}
                    </div>
                  </div>

                  <span style={{ ...qtyPillStyle, ...getActionTone(action.actionType) }}>
                    {action.quantity} parts
                  </span>
                </div>

                <div style={activityMetaStyle}>
                  {actionLabel(action.actionType)} • {action.quantity} parts •{" "}
                  {action.createdAt ? formatIrishDateTime(action.createdAt) : "—"}
                </div>

                {action.locationText ? (
                  <div style={activityMetaStyle}>{action.locationText}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "blue" | "orange" | "slate" | "green";
}) {
  const toneStyle =
    tone === "blue"
      ? kpiBlueStyle
      : tone === "orange"
        ? kpiOrangeStyle
        : tone === "green"
          ? kpiGreenStyle
          : kpiSlateStyle;

  return (
    <div style={{ ...kpiCardStyle, ...toneStyle }}>
      <div style={kpiLabelStyle}>{label}</div>
      <div style={kpiValueStyle}>{value}</div>
      <div style={kpiHintStyle}>{hint}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={panelStyle}>
      <div style={panelTitleStyle}>{title}</div>
      <div style={panelBodyStyle}>{children}</div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={metricRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyText() {
  return (
    <div style={emptyStateWrapStyle}>
      <div style={emptyTitleStyle}>No parts recorded yet</div>
      <div style={emptySubStyle}>Start adding parts to build your site record.</div>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: "grid",
  gap: "14px",
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const kpiCardStyle: CSSProperties = {
  borderRadius: "22px",
  padding: "16px 14px",
  minHeight: "128px",
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  gap: "8px",
  textAlign: "center",
  boxShadow: "0 14px 30px rgba(15,23,42,0.10)",
};

const kpiBlueStyle: CSSProperties = {
  background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)",
  color: "#1d4ed8",
};

const kpiOrangeStyle: CSSProperties = {
  background: "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)",
  color: "#9a3412",
};

const kpiSlateStyle: CSSProperties = {
  background: "linear-gradient(180deg, #f8fafc 0%, #e5e7eb 100%)",
  color: "#111827",
};

const kpiGreenStyle: CSSProperties = {
  background: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
  color: "#166534",
};

const kpiLabelStyle: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const kpiValueStyle: CSSProperties = {
  fontSize: "2rem",
  fontWeight: 900,
  lineHeight: 1,
};

const kpiHintStyle: CSSProperties = {
  fontSize: "0.84rem",
  lineHeight: 1.35,
  opacity: 0.86,
};

const visitCardStyle: CSSProperties = {
  borderRadius: "22px",
  padding: "16px",
  background: "linear-gradient(135deg, #0f172a 0%, #172554 100%)",
  color: "#f8fafc",
  boxShadow: "0 16px 28px rgba(15,23,42,0.16)",
};

const sectionKickerStyle: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 900,
  letterSpacing: "0.1em",
  color: "#93c5fd",
  marginBottom: "6px",
};

const visitTitleStyle: CSSProperties = {
  fontSize: "1.15rem",
  fontWeight: 900,
};

const visitSubStyle: CSSProperties = {
  marginTop: "4px",
  color: "#cbd5e1",
  fontSize: "0.92rem",
};

const panelGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const panelStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "14px",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  display: "grid",
  gap: "12px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const panelTitleStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 900,
  color: "#111827",
  textAlign: "center",
};

const panelBodyStyle: CSSProperties = {
  display: "grid",
  gap: "8px",
};

const metricRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "14px",
  background: "#f8fafc",
  color: "#374151",
};

const activityGridStyle: CSSProperties = {
  display: "grid",
  gap: "10px",
};

const activityCardStyle: CSSProperties = {
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  padding: "12px",
  display: "grid",
  gap: "8px",
};

const activityTopStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
};

const activityTitleStyle: CSSProperties = {
  fontWeight: 900,
};

const activityMetaStyle: CSSProperties = {
  color: "#6b7280",
  fontSize: "0.88rem",
  lineHeight: 1.35,
};

const qtyPillStyle: CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "0.76rem",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const emptyStateWrapStyle: CSSProperties = {
  textAlign: "center",
  padding: "14px 8px",
};

const emptyTitleStyle: CSSProperties = {
  fontWeight: 900,
  color: "#111827",
};

const emptySubStyle: CSSProperties = {
  marginTop: "4px",
  color: "#6b7280",
  fontSize: "0.9rem",
  lineHeight: 1.35,
};
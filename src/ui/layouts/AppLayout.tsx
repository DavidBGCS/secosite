import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GlobalUiStyles } from "../components/GlobalUiStyles";

type NavItem = {
  label: string;
  path: string;
  icon: string;
};

type SessionStatus = {
  isVisitActive?: boolean;
  visitLabel?: string;
  engineerName?: string;
  startedAt?: string;
  elapsedLabel?: string;
  serviceColumnLabel?: string;
};

export function AppLayout({
  title,
  subtitle,
  children,
  sessionStatus,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  sessionStatus?: SessionStatus;
}>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { siteFileId } = useParams<{ siteFileId: string }>();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState("00:00:00");

  const navItems: NavItem[] = siteFileId
    ? [
        { label: "Overview", path: `/site/${siteFileId}/overview`, icon: "⌂" },
        { label: "Assets", path: `/site/${siteFileId}/assets`, icon: "◫" },
        { label: "Service", path: `/site/${siteFileId}/service`, icon: "◌" },
        { label: "Faults", path: `/site/${siteFileId}/faults/open`, icon: "⚠" },
        { label: "Reports", path: `/site/${siteFileId}/reports`, icon: "▤" },
      ]
    : [{ label: "Sites", path: `/`, icon: "⌂" }];

  const canGoBack = useMemo(() => {
    return window.history.length > 1;
  }, []);

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
    const formatElapsed = (startedAt?: string) => {
      if (!startedAt) return "00:00:00";
      const started = new Date(startedAt).getTime();
      if (Number.isNaN(started)) return "00:00:00";

      const diffMs = Math.max(0, Date.now() - started);
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
    };

    if (sessionStatus?.elapsedLabel) {
      setLiveElapsed(sessionStatus.elapsedLabel);
      return;
    }

    if (!sessionStatus?.startedAt) {
      setLiveElapsed("00:00:00");
      return;
    }

    const update = () => {
      setLiveElapsed(formatElapsed(sessionStatus.startedAt));
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [sessionStatus?.startedAt, sessionStatus?.elapsedLabel]);

  const handleBack = () => {
    if (canGoBack) {
      navigate(-1);
      return;
    }

    if (siteFileId) {
      navigate(`/site/${siteFileId}/overview`);
      return;
    }

    navigate("/");
  };

  const isActivePath = (itemPath: string) => {
    if (location.pathname === itemPath) return true;

    if (!siteFileId) return false;

    if (
      itemPath.endsWith("/service") &&
      (location.pathname.includes(`/site/${siteFileId}/service`) ||
        location.pathname.includes(`/site/${siteFileId}/visit/`))
    ) {
      return true;
    }

    if (
      itemPath.endsWith("/faults/open") &&
      location.pathname.includes(`/site/${siteFileId}/faults/`)
    ) {
      return true;
    }

    return false;
  };

  const statusLabel = sessionStatus?.isVisitActive
    ? "Visit Active"
    : isOnline
      ? "Online"
      : "Offline";

  const statusDotColor = sessionStatus?.isVisitActive
    ? "#22c55e"
    : isOnline
      ? "#22c55e"
      : "#ef4444";

  const statusChipStyleFinal: React.CSSProperties = sessionStatus?.isVisitActive
    ? activeStatusChipStyle
    : isOnline
      ? onlineStatusChipStyle
      : offlineStatusChipStyle;

  return (
    <div style={shellStyle}>
      <GlobalUiStyles />

      <header style={topBarShellStyle}>
        <div style={topBarGlowStyle} />
        <div style={topBarInnerStyle}>
          <div style={topBarRowStyle}>
            <div style={topBarLeftStyle}>
              <button
                onClick={handleBack}
                style={backButtonStyle}
                aria-label="Back"
                type="button"
              >
                ←
              </button>

              {siteFileId ? (
                <button
                  onClick={() => navigate("/")}
                  style={homeButtonStyle}
                  aria-label="Sites"
                  type="button"
                >
                  ⌂
                </button>
              ) : null}

              <div style={titleBlockStyle}>
                <div style={brandKickerStyle}>SECO SITE</div>
                <div style={pageTitleStyle}>{title}</div>
                {subtitle ? <div style={pageSubtitleStyle}>{subtitle}</div> : null}
              </div>
            </div>

            <div style={topBarRightStyle}>
              <button
                type="button"
                onClick={() => setSessionPanelOpen((prev) => !prev)}
                style={statusChipStyleFinal}
                aria-label="Session status"
              >
                <span
                  style={{
                    ...statusDotStyle,
                    background: statusDotColor,
                    boxShadow: `0 0 0 4px ${statusDotColor}22`,
                  }}
                />
                <span>{statusLabel}</span>
              </button>
            </div>
          </div>

          {sessionPanelOpen ? (
            <div style={sessionPanelStyle}>
              <div style={sessionPanelHeaderStyle}>
                <div>
                  <div style={sessionPanelKickerStyle}>SESSION STATUS</div>
                  <div style={sessionPanelTitleStyle}>{statusLabel}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setSessionPanelOpen(false)}
                  style={sessionCloseButtonStyle}
                >
                  ✕
                </button>
              </div>

              <div style={sessionGridStyle}>
                <div style={sessionItemStyle}>
                  <div style={sessionItemLabelStyle}>Connectivity</div>
                  <div style={sessionItemValueStyle}>{isOnline ? "Online" : "Offline"}</div>
                </div>

                <div style={sessionItemStyle}>
                  <div style={sessionItemLabelStyle}>Visit State</div>
                  <div style={sessionItemValueStyle}>
                    {sessionStatus?.isVisitActive ? "Active" : "No active visit"}
                  </div>
                </div>

                <div style={sessionItemStyle}>
                  <div style={sessionItemLabelStyle}>Visit</div>
                  <div style={sessionItemValueStyle}>
                    {sessionStatus?.visitLabel ?? "—"}
                  </div>
                </div>

                <div style={sessionItemStyle}>
                  <div style={sessionItemLabelStyle}>Engineer</div>
                  <div style={sessionItemValueStyle}>
                    {sessionStatus?.engineerName ?? "—"}
                  </div>
                </div>

                <div style={sessionItemStyle}>
                  <div style={sessionItemLabelStyle}>Service</div>
                  <div style={sessionItemValueStyle}>
                    {sessionStatus?.serviceColumnLabel ?? "—"}
                  </div>
                </div>

                <div style={sessionItemStyle}>
                  <div style={sessionItemLabelStyle}>Elapsed</div>
                  <div style={sessionItemValueStyle}>
                    {sessionStatus?.isVisitActive ? liveElapsed : "—"}
                  </div>
                </div>
              </div>

              {siteFileId && sessionStatus?.isVisitActive ? (
                <div style={sessionActionsStyle}>
                  <button
                    type="button"
                    onClick={() => navigate(`/site/${siteFileId}/service`)}
                    style={sessionPrimaryActionStyle}
                  >
                    Open Service
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/site/${siteFileId}/overview`)}
                    style={sessionSecondaryActionStyle}
                  >
                    Go to Overview
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <main style={contentShellStyle}>
        <div style={contentInnerStyle}>{children}</div>
      </main>

      <nav style={bottomNavShellStyle}>
        <div style={bottomNavInnerStyle}>
          {navItems.map((item) => {
            const active = isActivePath(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={active ? bottomNavItemActiveStyle : bottomNavItemStyle}
                type="button"
              >
                <span style={bottomNavIconStyle}>{item.icon}</span>
                <span style={bottomNavLabelStyle}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(37,99,235,0.08) 0%, rgba(15,23,42,0) 28%), linear-gradient(180deg, #eef2f7 0%, #f5f7fa 100%)",
  color: "#111827",
};

const topBarShellStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  background: "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.92) 100%)",
  borderBottom: "1px solid rgba(148,163,184,0.18)",
  backdropFilter: "blur(14px)",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(2,6,23,0.18)",
};

const topBarGlowStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 20% 0%, rgba(37,99,235,0.28) 0%, rgba(37,99,235,0) 36%)",
  pointerEvents: "none",
};

const topBarInnerStyle: React.CSSProperties = {
  position: "relative",
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "14px 16px",
};

const topBarRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
};

const topBarLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
  flex: 1,
};

const topBarRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const backButtonStyle: React.CSSProperties = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(255,255,255,0.06)",
  color: "#e2e8f0",
  cursor: "pointer",
  fontSize: "1.3rem",
  lineHeight: 1,
  flexShrink: 0,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const homeButtonStyle: React.CSSProperties = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(255,255,255,0.06)",
  color: "#f8fafc",
  cursor: "pointer",
  fontSize: "1rem",
  lineHeight: 1,
  flexShrink: 0,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const titleBlockStyle: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const brandKickerStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  color: "#60a5fa",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  marginBottom: "4px",
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: "1.12rem",
  fontWeight: 800,
  color: "#f8fafc",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const pageSubtitleStyle: React.CSSProperties = {
  marginTop: "3px",
  fontSize: "0.9rem",
  color: "#94a3b8",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const baseStatusChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "0.76rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const onlineStatusChipStyle: React.CSSProperties = {
  ...baseStatusChipStyle,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(148,163,184,0.18)",
  color: "#cbd5e1",
};

const offlineStatusChipStyle: React.CSSProperties = {
  ...baseStatusChipStyle,
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.18)",
  color: "#fee2e2",
};

const activeStatusChipStyle: React.CSSProperties = {
  ...baseStatusChipStyle,
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.18)",
  color: "#dcfce7",
};

const statusDotStyle: React.CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
};

const sessionPanelStyle: React.CSSProperties = {
  marginTop: "12px",
  padding: "14px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(148,163,184,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const sessionPanelHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "start",
  gap: "10px",
  marginBottom: "12px",
};

const sessionPanelKickerStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  color: "#93c5fd",
  letterSpacing: "0.1em",
  marginBottom: "4px",
};

const sessionPanelTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 800,
  color: "#f8fafc",
};

const sessionCloseButtonStyle: React.CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "#e2e8f0",
  cursor: "pointer",
  flexShrink: 0,
};

const sessionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const sessionItemStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(148,163,184,0.12)",
};

const sessionItemLabelStyle: React.CSSProperties = {
  fontSize: "0.74rem",
  color: "#93c5fd",
  fontWeight: 800,
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const sessionItemValueStyle: React.CSSProperties = {
  fontSize: "0.92rem",
  color: "#f8fafc",
  fontWeight: 700,
  lineHeight: 1.35,
};

const sessionActionsStyle: React.CSSProperties = {
  marginTop: "12px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const sessionPrimaryActionStyle: React.CSSProperties = {
  minHeight: "46px",
  borderRadius: "14px",
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

const sessionSecondaryActionStyle: React.CSSProperties = {
  minHeight: "46px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "#f8fafc",
  fontWeight: 700,
  cursor: "pointer",
};

const contentShellStyle: React.CSSProperties = {
  width: "100%",
};

const contentInnerStyle: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "18px 16px 112px",
};

const bottomNavShellStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,
  padding: "12px 12px calc(12px + env(safe-area-inset-bottom, 0px))",
  pointerEvents: "none",
};

const bottomNavInnerStyle: React.CSSProperties = {
  maxWidth: "820px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "8px",
  padding: "8px",
  borderRadius: "24px",
  background: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(148,163,184,0.16)",
  boxShadow: "0 20px 40px rgba(2,6,23,0.24)",
  backdropFilter: "blur(18px)",
  pointerEvents: "auto",
};

const bottomNavItemStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  borderRadius: "18px",
  padding: "10px 6px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  color: "#94a3b8",
  minHeight: "60px",
  transition: "all 160ms ease",
};

const bottomNavItemActiveStyle: React.CSSProperties = {
  ...bottomNavItemStyle,
  background: "linear-gradient(180deg, rgba(37,99,235,0.24) 0%, rgba(37,99,235,0.14) 100%)",
  color: "#f8fafc",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const bottomNavIconStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  lineHeight: 1,
};

const bottomNavLabelStyle: React.CSSProperties = {
  fontSize: "0.76rem",
  fontWeight: 700,
  lineHeight: 1.1,
};
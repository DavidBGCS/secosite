import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GlobalUiStyles } from "../components/GlobalUiStyles";
export function AppLayout({ title, subtitle, children, sessionStatus, }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { siteFileId } = useParams();
    const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
    const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
    const [liveElapsed, setLiveElapsed] = useState("00:00:00");
    const navItems = siteFileId
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
        const formatElapsed = (startedAt) => {
            if (!startedAt)
                return "00:00:00";
            const started = new Date(startedAt).getTime();
            if (Number.isNaN(started))
                return "00:00:00";
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
    const isActivePath = (itemPath) => {
        if (location.pathname === itemPath)
            return true;
        if (!siteFileId)
            return false;
        if (itemPath.endsWith("/service") &&
            (location.pathname.includes(`/site/${siteFileId}/service`) ||
                location.pathname.includes(`/site/${siteFileId}/visit/`))) {
            return true;
        }
        if (itemPath.endsWith("/faults/open") &&
            location.pathname.includes(`/site/${siteFileId}/faults/`)) {
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
    const statusChipStyleFinal = sessionStatus?.isVisitActive
        ? activeStatusChipStyle
        : isOnline
            ? onlineStatusChipStyle
            : offlineStatusChipStyle;
    return (_jsxs("div", { style: shellStyle, children: [_jsx(GlobalUiStyles, {}), _jsxs("header", { style: topBarShellStyle, children: [_jsx("div", { style: topBarGlowStyle }), _jsxs("div", { style: topBarInnerStyle, children: [_jsxs("div", { style: topBarRowStyle, children: [_jsxs("div", { style: topBarLeftStyle, children: [_jsx("button", { onClick: handleBack, style: backButtonStyle, "aria-label": "Back", type: "button", children: "\u2190" }), siteFileId ? (_jsx("button", { onClick: () => navigate("/"), style: homeButtonStyle, "aria-label": "Sites", type: "button", children: "\u2302" })) : null, _jsxs("div", { style: titleBlockStyle, children: [_jsx("div", { style: brandKickerStyle, children: "SECO SITE" }), _jsx("div", { style: pageTitleStyle, children: title }), subtitle ? _jsx("div", { style: pageSubtitleStyle, children: subtitle }) : null] })] }), _jsx("div", { style: topBarRightStyle, children: _jsxs("button", { type: "button", onClick: () => setSessionPanelOpen((prev) => !prev), style: statusChipStyleFinal, "aria-label": "Session status", children: [_jsx("span", { style: {
                                                        ...statusDotStyle,
                                                        background: statusDotColor,
                                                        boxShadow: `0 0 0 4px ${statusDotColor}22`,
                                                    } }), _jsx("span", { children: statusLabel })] }) })] }), sessionPanelOpen ? (_jsxs("div", { style: sessionPanelStyle, children: [_jsxs("div", { style: sessionPanelHeaderStyle, children: [_jsxs("div", { children: [_jsx("div", { style: sessionPanelKickerStyle, children: "SESSION STATUS" }), _jsx("div", { style: sessionPanelTitleStyle, children: statusLabel })] }), _jsx("button", { type: "button", onClick: () => setSessionPanelOpen(false), style: sessionCloseButtonStyle, children: "\u2715" })] }), _jsxs("div", { style: sessionGridStyle, children: [_jsxs("div", { style: sessionItemStyle, children: [_jsx("div", { style: sessionItemLabelStyle, children: "Connectivity" }), _jsx("div", { style: sessionItemValueStyle, children: isOnline ? "Online" : "Offline" })] }), _jsxs("div", { style: sessionItemStyle, children: [_jsx("div", { style: sessionItemLabelStyle, children: "Visit State" }), _jsx("div", { style: sessionItemValueStyle, children: sessionStatus?.isVisitActive ? "Active" : "No active visit" })] }), _jsxs("div", { style: sessionItemStyle, children: [_jsx("div", { style: sessionItemLabelStyle, children: "Visit" }), _jsx("div", { style: sessionItemValueStyle, children: sessionStatus?.visitLabel ?? "—" })] }), _jsxs("div", { style: sessionItemStyle, children: [_jsx("div", { style: sessionItemLabelStyle, children: "Engineer" }), _jsx("div", { style: sessionItemValueStyle, children: sessionStatus?.engineerName ?? "—" })] }), _jsxs("div", { style: sessionItemStyle, children: [_jsx("div", { style: sessionItemLabelStyle, children: "Service" }), _jsx("div", { style: sessionItemValueStyle, children: sessionStatus?.serviceColumnLabel ?? "—" })] }), _jsxs("div", { style: sessionItemStyle, children: [_jsx("div", { style: sessionItemLabelStyle, children: "Elapsed" }), _jsx("div", { style: sessionItemValueStyle, children: sessionStatus?.isVisitActive ? liveElapsed : "—" })] })] }), siteFileId && sessionStatus?.isVisitActive ? (_jsxs("div", { style: sessionActionsStyle, children: [_jsx("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/service`), style: sessionPrimaryActionStyle, children: "Open Service" }), _jsx("button", { type: "button", onClick: () => navigate(`/site/${siteFileId}/overview`), style: sessionSecondaryActionStyle, children: "Go to Overview" })] })) : null] })) : null] })] }), _jsx("main", { style: contentShellStyle, children: _jsx("div", { style: contentInnerStyle, children: children }) }), _jsx("nav", { style: bottomNavShellStyle, children: _jsx("div", { style: bottomNavInnerStyle, children: navItems.map((item) => {
                        const active = isActivePath(item.path);
                        return (_jsxs("button", { onClick: () => navigate(item.path), style: active ? bottomNavItemActiveStyle : bottomNavItemStyle, type: "button", children: [_jsx("span", { style: bottomNavIconStyle, children: item.icon }), _jsx("span", { style: bottomNavLabelStyle, children: item.label })] }, item.path));
                    }) }) })] }));
}
const shellStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(37,99,235,0.08) 0%, rgba(15,23,42,0) 28%), linear-gradient(180deg, #eef2f7 0%, #f5f7fa 100%)",
    color: "#111827",
};
const topBarShellStyle = {
    position: "sticky",
    top: 0,
    zIndex: 40,
    background: "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,0.92) 100%)",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    backdropFilter: "blur(14px)",
    overflow: "hidden",
    boxShadow: "0 10px 24px rgba(2,6,23,0.18)",
};
const topBarGlowStyle = {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at 20% 0%, rgba(37,99,235,0.28) 0%, rgba(37,99,235,0) 36%)",
    pointerEvents: "none",
};
const topBarInnerStyle = {
    position: "relative",
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "14px 16px",
};
const topBarRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
};
const topBarLeftStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    flex: 1,
};
const topBarRightStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
};
const backButtonStyle = {
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
const homeButtonStyle = {
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
const titleBlockStyle = {
    minWidth: 0,
    flex: 1,
};
const brandKickerStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    color: "#60a5fa",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: "4px",
};
const pageTitleStyle = {
    fontSize: "1.12rem",
    fontWeight: 800,
    color: "#f8fafc",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};
const pageSubtitleStyle = {
    marginTop: "3px",
    fontSize: "0.9rem",
    color: "#94a3b8",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
};
const baseStatusChipStyle = {
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
const onlineStatusChipStyle = {
    ...baseStatusChipStyle,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(148,163,184,0.18)",
    color: "#cbd5e1",
};
const offlineStatusChipStyle = {
    ...baseStatusChipStyle,
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.18)",
    color: "#fee2e2",
};
const activeStatusChipStyle = {
    ...baseStatusChipStyle,
    background: "rgba(34,197,94,0.12)",
    border: "1px solid rgba(34,197,94,0.18)",
    color: "#dcfce7",
};
const statusDotStyle = {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
};
const sessionPanelStyle = {
    marginTop: "12px",
    padding: "14px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(148,163,184,0.18)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};
const sessionPanelHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: "10px",
    marginBottom: "12px",
};
const sessionPanelKickerStyle = {
    fontSize: "0.72rem",
    fontWeight: 800,
    color: "#93c5fd",
    letterSpacing: "0.1em",
    marginBottom: "4px",
};
const sessionPanelTitleStyle = {
    fontSize: "1rem",
    fontWeight: 800,
    color: "#f8fafc",
};
const sessionCloseButtonStyle = {
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    cursor: "pointer",
    flexShrink: 0,
};
const sessionGridStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const sessionItemStyle = {
    padding: "10px 12px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(148,163,184,0.12)",
};
const sessionItemLabelStyle = {
    fontSize: "0.74rem",
    color: "#93c5fd",
    fontWeight: 800,
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};
const sessionItemValueStyle = {
    fontSize: "0.92rem",
    color: "#f8fafc",
    fontWeight: 700,
    lineHeight: 1.35,
};
const sessionActionsStyle = {
    marginTop: "12px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
};
const sessionPrimaryActionStyle = {
    minHeight: "46px",
    borderRadius: "14px",
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
};
const sessionSecondaryActionStyle = {
    minHeight: "46px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#f8fafc",
    fontWeight: 700,
    cursor: "pointer",
};
const contentShellStyle = {
    width: "100%",
};
const contentInnerStyle = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "18px 16px 112px",
};
const bottomNavShellStyle = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    padding: "12px 12px calc(12px + env(safe-area-inset-bottom, 0px))",
    pointerEvents: "none",
};
const bottomNavInnerStyle = {
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
const bottomNavItemStyle = {
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
const bottomNavItemActiveStyle = {
    ...bottomNavItemStyle,
    background: "linear-gradient(180deg, rgba(37,99,235,0.24) 0%, rgba(37,99,235,0.14) 100%)",
    color: "#f8fafc",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};
const bottomNavIconStyle = {
    fontSize: "1.05rem",
    lineHeight: 1,
};
const bottomNavLabelStyle = {
    fontSize: "0.76rem",
    fontWeight: 700,
    lineHeight: 1.1,
};

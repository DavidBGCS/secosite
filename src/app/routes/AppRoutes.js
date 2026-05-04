import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/app/routes/AppRoutes.tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./PrivateRoute";
import { LoginPage } from "../../ui/pages/LoginPage";
import { SitesListPage } from "../../ui/pages/SitesListPage";
import { EditSitePage } from "../../ui/pages/EditSitePage";
import { SiteOverviewPage } from "../../ui/pages/SiteOverviewPage";
import { SiteNotesPage } from "../../ui/pages/SiteNotesPage";
import { DisciplineProfilesPage } from "../../ui/pages/DisciplineProfilesPage";
import { AssetsServiceMatrixPage } from "../../ui/pages/AssetsServiceMatrixPage";
import { VisitEntryPage } from "../../ui/pages/VisitEntryPage";
import { OpenFaultsPage } from "../../ui/pages/OpenFaultsPage";
import { ClosedFaultsPage } from "../../ui/pages/ClosedFaultsPage";
import { ReplacementHistoryPage } from "../../ui/pages/ReplacementHistoryPage";
import { ReportsPage } from "../../ui/pages/ReportsPage";
import { ServicePage } from "../../ui/pages/ServicePage";
import { AssetsPage } from "../../ui/pages/AssetsPage";
import { AssetHistoryPage } from "../../ui/pages/AssetHistoryPage";
import { AssetEditPage } from "../../ui/pages/AssetEditPage";
import { SitePartsPage } from "../../ui/pages/SitePartsPage";
import { SitePartsHistoryPage } from "../../ui/pages/SitePartsHistoryPage";
function Protected({ children }) {
    return _jsx(PrivateRoute, { children: children });
}
export function AppRoutes() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(Protected, { children: _jsx(SitesListPage, {}) }) }), _jsx(Route, { path: "/site/new", element: _jsx(Protected, { children: _jsx(EditSitePage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/edit", element: _jsx(Protected, { children: _jsx(EditSitePage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/overview", element: _jsx(Protected, { children: _jsx(SiteOverviewPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/site-notes", element: _jsx(Protected, { children: _jsx(SiteNotesPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/disciplines", element: _jsx(Protected, { children: _jsx(DisciplineProfilesPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/service", element: _jsx(Protected, { children: _jsx(ServicePage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/assets", element: _jsx(Protected, { children: _jsx(AssetsPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/parts", element: _jsx(Protected, { children: _jsx(SitePartsPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/visit/new", element: _jsx(Protected, { children: _jsx(VisitEntryPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/visit/:visitId", element: _jsx(Protected, { children: _jsx(VisitEntryPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/faults/open", element: _jsx(Protected, { children: _jsx(OpenFaultsPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/faults/closed", element: _jsx(Protected, { children: _jsx(ClosedFaultsPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/replacements", element: _jsx(Protected, { children: _jsx(ReplacementHistoryPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/assets/:assetId/history", element: _jsx(Protected, { children: _jsx(AssetHistoryPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/assets/:assetId/edit", element: _jsx(Protected, { children: _jsx(AssetEditPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/parts/history", element: _jsx(Protected, { children: _jsx(SitePartsHistoryPage, {}) }) }), _jsx(Route, { path: "/site/:siteFileId/reports", element: _jsx(Protected, { children: _jsx(ReportsPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}

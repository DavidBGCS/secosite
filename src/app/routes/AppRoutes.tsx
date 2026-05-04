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






function Protected({ children }: { children: React.ReactNode }) {
  return <PrivateRoute>{children}</PrivateRoute>;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <Protected>
              <SitesListPage />
            </Protected>
          }
        />

        <Route
          path="/site/new"
          element={
            <Protected>
              <EditSitePage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/edit"
          element={
            <Protected>
              <EditSitePage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/overview"
          element={
            <Protected>
              <SiteOverviewPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/site-notes"
          element={
            <Protected>
              <SiteNotesPage />
            </Protected>
          }
        />
        
        <Route
          path="/site/:siteFileId/disciplines"
          element={
            <Protected>
              <DisciplineProfilesPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/service"
          element={
            <Protected>
              <ServicePage />
            </Protected>
          }
        />        

        <Route
          path="/site/:siteFileId/assets"
          element={
            <Protected>
              <AssetsPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/parts"
          element={
            <Protected>
              <SitePartsPage />
            </Protected>
          }
        />


        <Route
          path="/site/:siteFileId/visit/new"
          element={
            <Protected>
              <VisitEntryPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/visit/:visitId"
          element={
            <Protected>
              <VisitEntryPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/faults/open"
          element={
            <Protected>
              <OpenFaultsPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/faults/closed"
          element={
            <Protected>
              <ClosedFaultsPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/replacements"
          element={
            <Protected>
              <ReplacementHistoryPage />
            </Protected>
          }
        />

         <Route
          path="/site/:siteFileId/assets/:assetId/history"
          element={
            <Protected>
              <AssetHistoryPage />
            </Protected>
          }
        />
       
        <Route
          path="/site/:siteFileId/assets/:assetId/edit"
          element={
            <Protected>
              <AssetEditPage />
            </Protected>
          }
        />

        <Route
          path="/site/:siteFileId/parts/history"
          element={
            <Protected>
              <SitePartsHistoryPage />
            </Protected>
          }
        />



        <Route
          path="/site/:siteFileId/reports"
          element={
            <Protected>
              <ReportsPage />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useSites } from "./useSites";
/* ---------------- NORMALISER ---------------- */
function normaliseSiteFile(data) {
    return {
        ...data,
        // 🔥 NEW PARTS SYSTEM (CRITICAL)
        installedParts: data.installedParts ?? [],
        partActions: data.partActions ?? [],
        // 🛡️ SAFE DEFAULTS (prevents future crashes)
        assets: data.assets ?? [],
        visits: data.visits ?? [],
        openFaults: data.openFaults ?? [],
        closedFaults: data.closedFaults ?? [],
        compliance: data.compliance ?? [],
        replacementHistory: data.replacementHistory ?? [],
        photos: data.photos ?? [],
        markups: data.markups ?? [],
        exportedReports: data.exportedReports ?? [],
    };
}
/* ---------------- HOOK ---------------- */
export function useFirestoreSite() {
    const { siteFileId } = useParams();
    const { sites, findSite, saveSite, loading, error } = useSites();
    const siteFile = useMemo(() => {
        if (!siteFileId)
            return undefined;
        const raw = findSite(siteFileId);
        if (!raw)
            return undefined;
        return normaliseSiteFile(raw);
    }, [findSite, siteFileId, sites]);
    /* ---------------- SAFE UPDATE ---------------- */
    const updateSite = async (next) => {
        const safe = {
            ...next,
            installedParts: next.installedParts ?? [],
            partActions: next.partActions ?? [],
        };
        return saveSite(safe);
    };
    return {
        siteFileId,
        siteFile,
        updateSite,
        saveSite: updateSite,
        loading,
        error,
    };
}

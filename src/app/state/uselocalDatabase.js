// src/app/state/useLocalDatabase.ts
import { useSites } from "./useSites";
export function useLocalDatabase() {
    const { sites, saveSite, deleteSite, findSite } = useSites();
    return {
        database: { sites },
        sites,
        addSite: saveSite,
        updateSite: saveSite,
        removeSite: deleteSite,
        findSite,
    };
}

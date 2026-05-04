// src/app/state/useCurrentSite.ts
import { useFirestoreSite } from "./useFirestoreSite";
export function useCurrentSite() {
    return useFirestoreSite();
}

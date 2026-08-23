import { create } from "zustand";
import dashboardService from "../services/dashboard.service";

const useDashboardStore = create((set) => ({
    dashboard: null,
    loading: false,

    fetchDashboard: async () => {
        try {

            set({
                loading: true,
            });

            const dashboard =
                await dashboardService.getDashboard();

            set({
                dashboard,
                loading: false,
            });

        } catch (error) {

            console.error(error);

            set({
                loading: false,
            });

        }
    },
}));

export default useDashboardStore;
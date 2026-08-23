import dashboardService from "../services/dashboard.service.js";
import ApiResponse from "../utils/ApiResponse.js";

const getDashboard = async (
    req,
    res,
    next
) => {

    try {

        const dashboard =
            await dashboardService.getDashboard();

        res.status(200).json(
            new ApiResponse(
                true,
                "Dashboard retrieved successfully.",
                dashboard
            )
        );

    } catch (error) {

        next(error);

    }

};

export default {
    getDashboard,
};
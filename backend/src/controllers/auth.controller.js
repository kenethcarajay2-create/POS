import authService from "../services/auth.service.js";
import ApiResponse from "../utils/ApiResponse.js";

const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);

        res.status(200).json(
            new ApiResponse(
                true,
                "Login successful",
                result
            )
        );
    } catch (error) {
        next(error);
    }
};

export default {
    login,
};
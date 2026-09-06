import authService from "../services/auth.service.js";

import ApiResponse from "../utils/ApiResponse.js";


/*
============================================================
USERNAME / PASSWORD LOGIN
============================================================
*/

const login =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await authService.login(
                    req.body
                );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Login successful",
                        result
                    )
                );

        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


/*
============================================================
RFID / NFC LOGIN
============================================================
*/

const rfidLogin =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await authService
                    .rfidLogin(
                        req.body
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "RFID login successful",
                        result
                    )
                );

        } catch (
            error
        ) {

            next(
                error
            );

        }

    };


export default {

    login,

    rfidLogin,

};
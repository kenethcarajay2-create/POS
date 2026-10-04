import onlineAuthService
    from "../services/onlineAuth.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


/*
============================================================
ONLINE LOGIN
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
                await onlineAuthService
                    .login(
                        req.body
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Online login successful",
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
ONLINE PROFILE
============================================================
*/

const profile =
    async (
        req,
        res,
        next
    ) => {

        try {

            const permissions =
                onlineAuthService
                    .buildPermissions(
                        req.user
                    );


            res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Online profile retrieved successfully",
                        {

                            user: {

                                id:
                                    req.user._id,

                                _id:
                                    req.user._id,

                                name:
                                    req.user.name,

                                username:
                                    req.user.username,

                                role:
                                    req.user.role,

                                profile: {

                                    image:
                                        req.user
                                            .profile
                                            ?.image ||
                                        "",

                                    nickname:
                                        req.user
                                            .profile
                                            ?.nickname ||
                                        "",

                                },

                                permissions,

                                branches:
                                    req.accessibleBranches,

                                defaultBranch:
                                    req.defaultBranch,

                                isActive:
                                    req.user
                                        .isActive,

                            },

                        }
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

    profile,

};
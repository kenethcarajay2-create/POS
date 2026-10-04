import preparedCartBridgeService
    from "../services/preparedCartBridge.service.js";

import ApiResponse
    from "../utils/ApiResponse.js";


/*
============================================================
CLAIM PREPARED CART
============================================================
*/

const claim =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await preparedCartBridgeService
                    .claimPreparedCart({

                        qrPayload:
                            req.body?.qrPayload,

                        branchId:
                            req.branchId,

                        userId:
                            req.user?._id ||
                            req.user?.id,

                    });


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Prepared cart claimed successfully.",
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
RECOVER PREPARED CART
============================================================
*/

const recover =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await preparedCartBridgeService
                    .recoverPreparedCart({

                        preparedCartId:
                            req.params.id,

                        claimToken:
                            req.body?.claimToken,

                        branchId:
                            req.branchId,

                        userId:
                            req.user?._id ||
                            req.user?.id,

                    });


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Prepared cart recovered successfully.",
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
RELEASE CLAIM
============================================================
*/

const release =
    async (
        req,
        res,
        next
    ) => {

        try {

            const result =
                await preparedCartBridgeService
                    .releasePreparedCart({

                        preparedCartId:
                            req.params.id,

                        claimToken:
                            req.body?.claimToken,

                        branchId:
                            req.branchId,

                        userId:
                            req.user?._id ||
                            req.user?.id,

                    });


            return res
                .status(
                    200
                )
                .json(
                    new ApiResponse(
                        true,
                        "Prepared cart claim released successfully.",
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

    claim,

    recover,

    release,

};
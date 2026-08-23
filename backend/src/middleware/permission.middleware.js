/*
============================================================
PERMISSION MIDDLEWARE
============================================================

ADMIN
→ Always allowed

OTHER USERS
→ Must have the requested permission
============================================================
*/

const permit = (
    permission
) => {

    return (
        req,
        res,
        next
    ) => {

        /*
        ================================================
        USER MUST EXIST
        ================================================
        */

        if (
            !req.user
        ) {

            return res.status(
                401
            ).json({

                success: false,

                message:
                    "Unauthorized",

                data: null,

            });

        }


        /*
        ================================================
        ADMIN BYPASS
        ================================================
        */

        if (
            req.user.role ===
            "admin"
        ) {

            return next();

        }


        /*
        ================================================
        PERMISSION CHECK
        ================================================
        */

        if (
            req.user
                .permissions?.[
                    permission
                ] ===
            true
        ) {

            return next();

        }


        /*
        ================================================
        FORBIDDEN
        ================================================
        */

        return res.status(
            403
        ).json({

            success: false,

            message:
                `You do not have permission to access ${permission}.`,

            data: null,

        });

    };

};


export default permit;
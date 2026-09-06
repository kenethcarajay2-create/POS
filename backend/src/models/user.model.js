import mongoose from "mongoose";


/*
============================================================
DEFAULT PERMISSIONS
============================================================

These are only defaults.

You can still manually turn permissions on/off
for each user from the Users page.
============================================================
*/

const defaultPermissions = {

    dashboard:
        true,

    products:
        false,

    inventory:
        false,

    pos:
        false,

    sales:
        false,

    customers:
        false,

    suppliers:
        false,

    workers:
        false,

    ledger:
        false,

    reports:
        false,

    users:
        false,

    settings:
        false,


    /*
    ========================================================
    SALES ACTION PERMISSIONS
    ========================================================
    */

    salesRefund:
        false,

    salesVoid:
        false,

    salesReprint:
        false,

};


/*
============================================================
NORMALIZE RFID / NFC UID
============================================================

Examples:

04:A3:D8:91:7C:2B:80
04-A3-D8-91-7C-2B-80
04a3d8917c2b80

All become:

04A3D8917C2B80
============================================================
*/

const normalizeRfidUid = (
    value
) => {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {

        return "";

    }


    return String(
        value
    )
        .replace(
            /[^a-zA-Z0-9]/g,
            ""
        )
        .toUpperCase()
        .trim();

};


/*
============================================================
USER SCHEMA
============================================================
*/

const userSchema =
    new mongoose.Schema(
        {

            /*
            ====================================================
            NAME
            ====================================================
            */

            name: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    100,

            },


            /*
            ====================================================
            USERNAME
            ====================================================
            */

            username: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                trim:
                    true,

                lowercase:
                    true,

                maxlength:
                    100,

            },


            /*
            ====================================================
            PASSWORD
            ====================================================
            */

            password: {

                type:
                    String,

                required:
                    true,

            },


            /*
            ====================================================
            ROLE
            ====================================================

            Role is mainly used for:

            - labels
            - default permission presets
            - special Admin handling

            Permissions should control actual page access.
            ====================================================
            */

            role: {

                type:
                    String,

                enum: [
                    "admin",
                    "manager",
                    "cashier",
                    "inventory",
                    "payroll",
                    "custom",
                ],

                default:
                    "cashier",

            },


            /*
            ====================================================
            PROFILE
            ====================================================

            Used for:

            - profile picture
            - login welcome animation
            - user display
            - future worker/user profile page

            Example:

            profile: {
                image: "/uploads/profiles/user-123.jpg",
                nickname: "Kent"
            }
            ====================================================
            */

            profile: {

                /*
                ------------------------------------------------
                PROFILE IMAGE
                ------------------------------------------------

                Store a URL/path only.

                Do NOT store the actual binary image here.
                ------------------------------------------------
                */

                image: {

                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,

                    maxlength:
                        500,

                },


                /*
                ------------------------------------------------
                NICKNAME
                ------------------------------------------------
                */

                nickname: {

                    type:
                        String,

                    default:
                        "",

                    trim:
                        true,

                    maxlength:
                        50,

                },

            },


            /*
            ====================================================
            RFID / NFC UID
            ====================================================

            Optional.

            Empty string:
            → no card assigned

            Example:
            04A3D8917C2B80

            Used for tap-to-login.
            ====================================================
            */

            rfidUid: {

                type:
                    String,

                default:
                    "",

                trim:
                    true,

                uppercase:
                    true,

                set:
                    normalizeRfidUid,

                maxlength:
                    100,

            },


            /*
            ====================================================
            PERMISSIONS
            ====================================================

            Each permission controls access to a page.

            Example:

            permissions: {
                dashboard: true,
                pos: true,
                sales: true,
                inventory: false,
            }

            Admin users are forced to full access below.
            ====================================================
            */

            permissions: {

                /*
                ------------------------------------------------
                DASHBOARD
                ------------------------------------------------
                */

                dashboard: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.dashboard,

                },


                /*
                ------------------------------------------------
                PRODUCTS
                ------------------------------------------------
                */

                products: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.products,

                },


                /*
                ------------------------------------------------
                INVENTORY
                ------------------------------------------------
                */

                inventory: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.inventory,

                },


                /*
                ------------------------------------------------
                POS
                ------------------------------------------------
                */

                pos: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.pos,

                },


                /*
                ------------------------------------------------
                SALES
                ------------------------------------------------
                */

                sales: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.sales,

                },


                /*
                ------------------------------------------------
                CUSTOMERS
                ------------------------------------------------
                */

                customers: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.customers,

                },


                /*
                ------------------------------------------------
                SUPPLIERS
                ------------------------------------------------
                */

                suppliers: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.suppliers,

                },


                /*
                ------------------------------------------------
                WORKERS
                ------------------------------------------------
                */

                workers: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.workers,

                },


                /*
                ------------------------------------------------
                LEDGER
                ------------------------------------------------
                */

                ledger: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.ledger,

                },


                /*
                ------------------------------------------------
                REPORTS
                ------------------------------------------------
                */

                reports: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.reports,

                },


                /*
                ------------------------------------------------
                USERS
                ------------------------------------------------
                */

                users: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.users,

                },


                /*
                ------------------------------------------------
                SETTINGS
                ------------------------------------------------
                */

                settings: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.settings,

                },


                /*
                ------------------------------------------------
                SALES REFUND
                ------------------------------------------------
                */

                salesRefund: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.salesRefund,

                },


                /*
                ------------------------------------------------
                SALES VOID
                ------------------------------------------------
                */

                salesVoid: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.salesVoid,

                },


                /*
                ------------------------------------------------
                SALES REPRINT
                ------------------------------------------------
                */

                salesReprint: {

                    type:
                        Boolean,

                    default:
                        defaultPermissions.salesReprint,

                },

            },


            /*
            ====================================================
            ACTIVE STATUS
            ====================================================
            */

            isActive: {

                type:
                    Boolean,

                default:
                    true,

            },

        },
        {

            timestamps:
                true,

        }
    );


/*
============================================================
ADMIN PERMISSIONS
============================================================

Whenever an admin user is saved:

Force every permission to TRUE.

This prevents accidentally creating an Admin account that
cannot access part of the system.
============================================================
*/

userSchema.pre(
    "save",
    function () {

        if (
            this.role !==
            "admin"
        ) {

            return;

        }


        this.permissions = {

            dashboard:
                true,

            products:
                true,

            inventory:
                true,

            pos:
                true,

            sales:
                true,

            customers:
                true,

            suppliers:
                true,

            workers:
                true,

            ledger:
                true,

            reports:
                true,

            users:
                true,

            settings:
                true,

            salesRefund:
                true,

            salesVoid:
                true,

            salesReprint:
                true,

        };

    }
);


/*
============================================================
NORMALIZE RFID BEFORE VALIDATION
============================================================

This also protects older code paths that may assign a raw UID.
============================================================
*/

userSchema.pre(
    "validate",
    function () {

        this.rfidUid =
            normalizeRfidUid(
                this.rfidUid
            );

    }
);


/*
============================================================
INDEXES
============================================================
*/


/*
------------------------------------------------------------
ROLE + ACTIVE
------------------------------------------------------------
*/

userSchema.index({

    role:
        1,

    isActive:
        1,

});


/*
------------------------------------------------------------
ACTIVE USERS
------------------------------------------------------------
*/

userSchema.index({

    isActive:
        1,

});


/*
------------------------------------------------------------
RFID / NFC UID
------------------------------------------------------------

Only non-empty assigned cards should be unique.

partialFilterExpression avoids duplicate-key problems
from every user having the default empty string.
------------------------------------------------------------
*/

userSchema.index(
    {
        rfidUid:
            1,
    },
    {
        unique:
            true,

        partialFilterExpression: {

            rfidUid: {
                $type:
                    "string",

                $ne:
                    "",
            },

        },
    }
);


/*
============================================================
MODEL
============================================================
*/

const User =
    mongoose.model(
        "User",
        userSchema
    );


export default User;


/*
============================================================
OPTIONAL EXPORT

Useful later in auth.service.js when implementing RFID login.
============================================================
*/

export {
    normalizeRfidUid,
};
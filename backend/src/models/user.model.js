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

    dashboard: true,

    products: false,

    inventory: false,

    pos: false,

    sales: false,

    customers: false,

    suppliers: false,

    workers: false,

    ledger: false,

    reports: false,

    users: false,

    settings: false,

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

                type: String,

                required: true,

                trim: true,

            },


            /*
            ====================================================
            USERNAME
            ====================================================
            */

            username: {

                type: String,

                required: true,

                unique: true,

                trim: true,

                lowercase: true,

            },


            /*
            ====================================================
            PASSWORD
            ====================================================
            */

            password: {

                type: String,

                required: true,

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

                type: String,

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

            Admin can still be treated as full access
            regardless of these values.
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

                salesRefund: {
    type: Boolean,
    default: false,
},

salesVoid: {
    type: Boolean,
    default: false,
},

salesReprint: {
    type: Boolean,
    default: false,
},

            },



            /*
            ====================================================
            ACTIVE STATUS
            ====================================================
            */

            isActive: {

                type: Boolean,

                default: true,

            },

        },
        {

            timestamps: true,

        }
    );


/*
============================================================
ADMIN PERMISSIONS
============================================================

Whenever an admin user is saved, force every page
permission to true.

This prevents accidentally creating an Admin account
that cannot access part of the system.
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

            dashboard: true,

            products: true,

            inventory: true,

            pos: true,

            sales: true,

            customers: true,

            suppliers: true,

            workers: true,

            ledger: true,

            reports: true,

            users: true,

            settings: true,

        };

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
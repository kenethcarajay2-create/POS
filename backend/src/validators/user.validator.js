import Joi from "joi";


/*
============================================================
ALLOWED ROLES
============================================================
*/

const allowedRoles = [

    "admin",

    "manager",

    "cashier",

    "inventory",

    "payroll",

    "custom",

];


/*
============================================================
MONGODB OBJECT ID
============================================================
*/

const objectIdSchema =
    Joi.string()
        .trim()
        .pattern(
            /^[0-9a-fA-F]{24}$/
        );


/*
============================================================
PROFILE
============================================================
*/

const profileSchema =
    Joi.object({

        image:
            Joi.string()
                .trim()
                .max(
                    500
                )
                .allow(
                    ""
                )
                .optional(),

        nickname:
            Joi.string()
                .trim()
                .max(
                    50
                )
                .allow(
                    ""
                )
                .optional(),

    });


/*
============================================================
PERMISSIONS
============================================================

IMPORTANT:

Every permission supported by:

- User model
- User service
- Users page
- Permission middleware

must also be declared here.

Otherwise validation may remove or reject the permission
before it reaches userService.
============================================================
*/

const permissionsSchema =
    Joi.object({

        dashboard:
            Joi.boolean(),

        products:
            Joi.boolean(),

        inventory:
            Joi.boolean(),

        pos:
            Joi.boolean(),

        bulkOrder:
            Joi.boolean(),

        sales:
            Joi.boolean(),

        customers:
            Joi.boolean(),

        suppliers:
            Joi.boolean(),

        workers:
            Joi.boolean(),

        ledger:
            Joi.boolean(),

        reports:
            Joi.boolean(),

        users:
            Joi.boolean(),

        settings:
            Joi.boolean(),

        salesRefund:
            Joi.boolean(),

        salesVoid:
            Joi.boolean(),

        salesReprint:
            Joi.boolean(),

    });


/*
============================================================
BRANCHES
============================================================

Branch IDs are MongoDB ObjectIds.

For non-admin users:
- branches contains the branches they may access.
- defaultBranch must be one of those branches.

For administrators:
- branches may be empty because administrators receive
  access to all active branches in the service layer.
- defaultBranch may still be used as their starting branch.

The service layer remains responsible for validating:
- whether the branches actually exist
- whether the branches are active/allowed
- whether defaultBranch belongs to the assignment
============================================================
*/

const branchesSchema =
    Joi.array()
        .items(
            objectIdSchema
        )
        .unique();


const defaultBranchSchema =
    objectIdSchema
        .allow(
            null
        );


/*
============================================================
CREATE USER
============================================================
*/

const createUserSchema =
    Joi.object({

        name:
            Joi.string()
                .trim()
                .min(
                    2
                )
                .max(
                    100
                )
                .required(),

        username:
            Joi.string()
                .trim()
                .min(
                    3
                )
                .max(
                    50
                )
                .required(),

        password:
            Joi.string()
                .min(
                    6
                )
                .max(
                    128
                )
                .required(),

        role:
            Joi.string()
                .valid(
                    ...allowedRoles
                )
                .default(
                    "cashier"
                ),


        /*
        ====================================================
        PROFILE
        ====================================================
        */

        profile:
            profileSchema
                .optional(),


        /*
        ====================================================
        BRANCH ACCESS
        ====================================================
        */

        branches:
            branchesSchema
                .optional(),

        defaultBranch:
            defaultBranchSchema
                .optional(),


        /*
        ====================================================
        RFID / NFC
        ====================================================

        "" = no card assigned
        ====================================================
        */

        rfidUid:
            Joi.string()
                .trim()
                .max(
                    100
                )
                .allow(
                    ""
                )
                .optional(),


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        permissions:
            permissionsSchema
                .optional(),

    });


/*
============================================================
UPDATE USER
============================================================
*/

const updateUserSchema =
    Joi.object({

        name:
            Joi.string()
                .trim()
                .min(
                    2
                )
                .max(
                    100
                )
                .optional(),

        username:
            Joi.string()
                .trim()
                .min(
                    3
                )
                .max(
                    50
                )
                .optional(),

        role:
            Joi.string()
                .valid(
                    ...allowedRoles
                )
                .optional(),


        /*
        ====================================================
        PROFILE
        ====================================================
        */

        profile:
            profileSchema
                .optional(),


        /*
        ====================================================
        BRANCH ACCESS
        ====================================================

        IMPORTANT:

        These fields must exist in the UPDATE validator too.

        Otherwise PATCH /users/:id can receive the branch
        assignment from the frontend but the validated body
        will not pass it to userService.updateUser().
        ====================================================
        */

        branches:
            branchesSchema
                .optional(),

        defaultBranch:
            defaultBranchSchema
                .optional(),


        /*
        ====================================================
        RFID / NFC
        ====================================================
        */

        rfidUid:
            Joi.string()
                .trim()
                .max(
                    100
                )
                .allow(
                    ""
                )
                .optional(),


        /*
        ====================================================
        PERMISSIONS
        ====================================================
        */

        permissions:
            permissionsSchema
                .optional(),


        /*
        ====================================================
        ACTIVE
        ====================================================
        */

        isActive:
            Joi.boolean()
                .optional(),

    })
        .min(
            1
        );


/*
============================================================
UPDATE PASSWORD
============================================================
*/

const updatePasswordSchema =
    Joi.object({

        password:
            Joi.string()
                .min(
                    6
                )
                .max(
                    128
                )
                .required(),

    });


/*
============================================================
EXPORT
============================================================
*/

export default {

    createUserSchema,

    updateUserSchema,

    updatePasswordSchema,

};
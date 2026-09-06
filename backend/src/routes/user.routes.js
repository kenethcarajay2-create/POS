import express from "express";

import userController from "../controllers/user.controller.js";

import protect from "../middleware/auth.middleware.js";

import authorize from "../middleware/role.middleware.js";

import validate from "../middleware/validate.middleware.js";

import userValidator from "../validators/user.validator.js";

import upload from "../middleware/upload.middleware.js";


const router =
    express.Router();


/*
==========================================================
GET ALL USERS
==========================================================

GET /api/users
==========================================================
*/

router.get(
    "/",

    protect,

    authorize(
        "admin"
    ),

    userController.getUsers
);


router.patch(
    "/:id/profile-image",

    protect,

    authorize(
        "admin"
    ),

    upload.single(
        "image"
    ),

    userController.uploadProfileImage
);
/*
==========================================================
GET USER BY ID
==========================================================

GET /api/users/:id
==========================================================
*/

router.get(
    "/:id",

    protect,

    authorize(
        "admin"
    ),

    userController.getUserById
);


/*
==========================================================
CREATE USER
==========================================================

POST /api/users
==========================================================
*/

router.post(
    "/",

    protect,

    authorize(
        "admin"
    ),

    validate(
        userValidator
            .createUserSchema
    ),

    userController.createUser
);


/*
==========================================================
UPDATE USER
==========================================================

PATCH /api/users/:id

Supports:

{
    "name": "Juan",
    "profile": {
        "nickname": "Johnny",
        "image": "/uploads/profiles/juan.jpg"
    },
    "rfidUid": "0944697426"
}
==========================================================
*/

router.patch(
    "/:id",

    protect,

    authorize(
        "admin"
    ),

    validate(
        userValidator
            .updateUserSchema
    ),

    userController.updateUser
);


/*
==========================================================
CHANGE PASSWORD
==========================================================

PATCH /api/users/:id/password
==========================================================
*/

router.patch(
    "/:id/password",

    protect,

    authorize(
        "admin"
    ),

    validate(
        userValidator
            .updatePasswordSchema
    ),

    userController.updatePassword
);


/*
==========================================================
DISABLE USER
==========================================================
*/

router.patch(
    "/:id/disable",

    protect,

    authorize(
        "admin"
    ),

    userController.disableUser
);


/*
==========================================================
ENABLE USER
==========================================================
*/

router.patch(
    "/:id/enable",

    protect,

    authorize(
        "admin"
    ),

    userController.enableUser
);


export default router;
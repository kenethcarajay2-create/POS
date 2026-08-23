import express from "express";

import userController from "../controllers/user.controller.js";

import protect from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

import validate from "../middleware/validate.middleware.js";
import userValidator from "../validators/user.validator.js";


const router = express.Router();


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
    authorize("admin"),
    userController.getUsers
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
    authorize("admin"),
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
    authorize("admin"),
    validate(
        userValidator.createUserSchema
    ),
    userController.createUser
);


/*
==========================================================
UPDATE USER
==========================================================
PATCH /api/users/:id
==========================================================
*/

router.patch(
    "/:id",
    protect,
    authorize("admin"),
    validate(
        userValidator.updateUserSchema
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
    authorize("admin"),
    validate(
        userValidator.updatePasswordSchema
    ),
    userController.updatePassword
);


/*
==========================================================
DISABLE USER
==========================================================
PATCH /api/users/:id/disable
==========================================================
*/

router.patch(
    "/:id/disable",
    protect,
    authorize("admin"),
    userController.disableUser
);


/*
==========================================================
ENABLE USER
==========================================================
PATCH /api/users/:id/enable
==========================================================
*/

router.patch(
    "/:id/enable",
    protect,
    authorize("admin"),
    userController.enableUser
);


export default router;
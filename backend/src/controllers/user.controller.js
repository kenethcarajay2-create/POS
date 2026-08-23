import userService from "../services/user.service.js";
import ApiResponse from "../utils/ApiResponse.js";


/*
==========================================================
GET ALL USERS
==========================================================
*/

const getUsers = async (
    req,
    res,
    next
) => {

    try {

        const users =
            await userService.getUsers();


        res.status(200).json(

            new ApiResponse(
                true,
                "Users retrieved successfully",
                users
            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
GET USER BY ID
==========================================================
*/

const getUserById = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await userService.getUserById(
                req.params.id
            );


        res.status(200).json(

            new ApiResponse(
                true,
                "User retrieved successfully",
                user
            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
CREATE USER
==========================================================
*/

const createUser = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await userService.createUser(
                req.body
            );


        res.status(201).json(

            new ApiResponse(
                true,
                "User created successfully",
                user
            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
UPDATE USER
==========================================================
*/

const updateUser = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await userService.updateUser(

                req.params.id,

                req.body

            );


        res.status(200).json(

            new ApiResponse(
                true,
                "User updated successfully",
                user
            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
CHANGE PASSWORD
==========================================================
*/

const updatePassword = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await userService.updatePassword(

                req.params.id,

                req.body.password

            );


        res.status(200).json(

            new ApiResponse(
                true,
                "Password updated successfully",
                user

            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
DISABLE USER
==========================================================
*/

const disableUser = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await userService.disableUser(
                req.params.id
            );


        res.status(200).json(

            new ApiResponse(
                true,
                "User disabled successfully",
                user
            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
ENABLE USER
==========================================================
*/

const enableUser = async (
    req,
    res,
    next
) => {

    try {

        const user =
            await userService.enableUser(
                req.params.id
            );


        res.status(200).json(

            new ApiResponse(
                true,
                "User enabled successfully",
                user
            )

        );

    } catch (error) {

        next(error);

    }

};


/*
==========================================================
EXPORT
==========================================================
*/

export default {

    getUsers,

    getUserById,

    createUser,

    updateUser,

    updatePassword,

    disableUser,

    enableUser,

};
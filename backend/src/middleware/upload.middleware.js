import multer from "multer";
import path from "path";
import fs from "fs";


/*
============================================================
PROFILE UPLOAD DIRECTORY
============================================================
*/

const uploadDirectory =
    path.join(
        process.cwd(),
        "uploads",
        "profiles"
    );


/*
============================================================
ENSURE DIRECTORY EXISTS
============================================================
*/

if (
    !fs.existsSync(
        uploadDirectory
    )
) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive:
                true,
        }
    );

}


/*
============================================================
STORAGE
============================================================
*/

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            callback
        ) => {

            callback(
                null,
                uploadDirectory
            );

        },


        filename: (
            req,
            file,
            callback
        ) => {

            const extension =
                path.extname(
                    file.originalname
                )
                    .toLowerCase();


            const filename =
                `profile-${Date.now()}-${Math.round(
                    Math.random() *
                    1e9
                )}${extension}`;


            callback(
                null,
                filename
            );

        },

    });


/*
============================================================
FILE FILTER
============================================================
*/

const fileFilter =
    (
        req,
        file,
        callback
    ) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];


        if (
            !allowedTypes.includes(
                file.mimetype
            )
        ) {

            return callback(
                new Error(
                    "Only JPG, PNG, and WEBP images are allowed."
                )
            );

        }


        callback(
            null,
            true
        );

    };


/*
============================================================
UPLOAD
============================================================
*/

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                5 *
                1024 *
                1024,

        },

    });


export default upload;
import mongoose from "mongoose";


/*
============================================================
WITH TRANSACTION
============================================================

Uses MongoDB driver's transaction helper.

session.withTransaction() automatically retries certain
transient transaction failures and commit uncertainty.

IMPORTANT:

MongoDB transactions require a replica set.

MongoDB Atlas already supports this.

A local standalone mongod does not.
============================================================
*/

const withTransaction = async (
    callback
) => {

    const session =
        await mongoose.startSession();


    try {

        let result;


        await session.withTransaction(
            async () => {

                result =
                    await callback(
                        session
                    );

            }
        );


        return result;


    } finally {

        await session.endSession();

    }

};


export default withTransaction;
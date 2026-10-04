import api from "../api/api";


/*
============================================================
RECOVERY STORAGE
============================================================

Desktop PreparedCart recovery credentials.

sessionStorage survives page refresh / Ctrl+R but remains
scoped to the current browser session.

We intentionally store only:

- preparedCartId
- claimToken

Product information, stock, and pricing are NOT trusted from
browser storage. They are revalidated by the backend during
recovery.
============================================================
*/

const RECOVERY_STORAGE_KEY =
    "storepos_desktop_prepared_cart_claim";


/*
============================================================
CLAIM PREPARED CART
============================================================
*/

const claimPreparedCart =
    async (
        qrPayload
    ) => {

        const response =
            await api.post(
                "/prepared-carts/claim",
                {
                    qrPayload,
                }
            );


        return response.data.data;

    };


/*
============================================================
RECOVER PREPARED CART
============================================================

Used after a desktop browser refresh.

This does NOT create another claim.

The backend verifies:

- PreparedCart ID
- active branch
- cashier
- CLAIMED status
- claim token hash
- local sale/finalize state

The backend then revalidates the current local products,
inventory, and pricing.
============================================================
*/

const recoverPreparedCart =
    async (
        preparedCartId,
        claimToken
    ) => {

        if (
            !preparedCartId ||
            !claimToken
        ) {

            throw new Error(
                "Prepared cart recovery credentials are incomplete."
            );

        }


        const response =
            await api.post(
                `/prepared-carts/${preparedCartId}/recover`,
                {
                    claimToken,
                }
            );


        return response.data.data;

    };


/*
============================================================
RELEASE PREPARED CART
============================================================
*/

const releasePreparedCart =
    async (
        preparedCartId,
        claimToken
    ) => {

        if (
            !preparedCartId ||
            !claimToken
        ) {

            return null;

        }


        const response =
            await api.post(
                `/prepared-carts/${preparedCartId}/release`,
                {
                    claimToken,
                }
            );


        return response.data.data;

    };


/*
============================================================
SAVE RECOVERY CLAIM
============================================================

IMPORTANT:

Save this immediately after a successful cloud claim.

That way, if React crashes or the browser refreshes after the
claim but before checkout, the same claim can be recovered.
============================================================
*/

const saveRecoveryClaim =
    ({
        preparedCartId,
        claimToken,
    } = {}) => {

        if (
            !preparedCartId ||
            !claimToken
        ) {

            return false;

        }


        try {

            const recoveryData = {

                preparedCartId:
                    String(
                        preparedCartId
                    ),

                claimToken:
                    String(
                        claimToken
                    ),

            };


            sessionStorage.setItem(
                RECOVERY_STORAGE_KEY,
                JSON.stringify(
                    recoveryData
                )
            );


            return true;


        } catch (
            error
        ) {

            console.warn(
                "Unable to save PreparedCart recovery state:",
                error
            );


            return false;

        }

    };


/*
============================================================
GET RECOVERY CLAIM
============================================================

Returns:

{
    preparedCartId,
    claimToken
}

or:

null
============================================================
*/

const getRecoveryClaim =
    () => {

        try {

            const raw =
                sessionStorage.getItem(
                    RECOVERY_STORAGE_KEY
                );


            if (
                !raw
            ) {

                return null;

            }


            const parsed =
                JSON.parse(
                    raw
                );


            const preparedCartId =
                String(
                    parsed?.preparedCartId ||
                    ""
                ).trim();


            const claimToken =
                String(
                    parsed?.claimToken ||
                    ""
                ).trim();


            /*
            ====================================================
            INVALID STORED STATE
            ====================================================
            */

            if (
                !preparedCartId ||
                !claimToken
            ) {

                sessionStorage.removeItem(
                    RECOVERY_STORAGE_KEY
                );


                return null;

            }


            return {

                preparedCartId,

                claimToken,

            };


        } catch (
            error
        ) {

            console.warn(
                "Unable to read PreparedCart recovery state:",
                error
            );


            /*
            Corrupted JSON cannot be recovered safely.
            */

            try {

                sessionStorage.removeItem(
                    RECOVERY_STORAGE_KEY
                );

            } catch (
                storageError
            ) {

                console.warn(
                    "Unable to clear invalid PreparedCart recovery state:",
                    storageError
                );

            }


            return null;

        }

    };


/*
============================================================
CLEAR RECOVERY CLAIM
============================================================
*/

const clearRecoveryClaim =
    () => {

        try {

            sessionStorage.removeItem(
                RECOVERY_STORAGE_KEY
            );


            return true;


        } catch (
            error
        ) {

            console.warn(
                "Unable to clear PreparedCart recovery state:",
                error
            );


            return false;

        }

    };


/*
============================================================
HAS RECOVERY CLAIM
============================================================
*/

const hasRecoveryClaim =
    () => {

        return Boolean(
            getRecoveryClaim()
        );

    };


/*
============================================================
EXPORT
============================================================
*/

const preparedCartService = {

    claimPreparedCart,

    recoverPreparedCart,

    releasePreparedCart,

    saveRecoveryClaim,

    getRecoveryClaim,

    clearRecoveryClaim,

    hasRecoveryClaim,

};


export default preparedCartService;
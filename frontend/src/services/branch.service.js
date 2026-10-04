import api from "../api/api";


/*
============================================================
GET ACCESSIBLE BRANCHES
============================================================

Available to the authenticated user.

Admin:
    all active branches

Other roles:
    assigned active branches
============================================================
*/

const getAccessibleBranches =
    async () => {

        const response =
            await api.get(
                "/branches/accessible"
            );


        return (
            response.data?.data ||
            {
                branches: [],
                defaultBranch: null,
            }
        );

    };


/*
============================================================
GET ACTIVE BRANCH
============================================================
*/

const getActiveBranch =
    async () => {

        const response =
            await api.get(
                "/branches/active"
            );


        return (
            response.data?.data
                ?.activeBranch ||
            null
        );

    };


/*
============================================================
GET DEFAULT BRANCH
============================================================
*/

const getDefaultBranch =
    async () => {

        const response =
            await api.get(
                "/branches/default"
            );


        return (
            response.data?.data ||
            null
        );

    };


/*
============================================================
GET ALL BRANCHES
============================================================

Admin only.

includeInactive=true is useful for Settings → Branch
Management.
============================================================
*/

const getBranches =
    async (
        includeInactive =
            false
    ) => {

        const response =
            await api.get(
                "/branches",
                {
                    params: {
                        includeInactive,
                    },
                }
            );


        return (
            response.data?.data ||
            []
        );

    };


/*
============================================================
GET BRANCH
============================================================
*/

const getBranchById =
    async (
        id
    ) => {

        const response =
            await api.get(
                `/branches/${id}`
            );


        return response.data.data;

    };


/*
============================================================
CREATE BRANCH
============================================================
*/

const createBranch =
    async (
        data
    ) => {

        const response =
            await api.post(
                "/branches",
                data
            );


        return response.data.data;

    };


/*
============================================================
UPDATE BRANCH
============================================================
*/

const updateBranch =
    async (
        id,
        data
    ) => {

        const response =
            await api.patch(
                `/branches/${id}`,
                data
            );


        return response.data.data;

    };


/*
============================================================
DISABLE BRANCH
============================================================
*/

const disableBranch =
    async (
        id
    ) => {

        const response =
            await api.patch(
                `/branches/${id}/disable`
            );


        return response.data.data;

    };


/*
============================================================
ENABLE BRANCH
============================================================
*/

const enableBranch =
    async (
        id
    ) => {

        const response =
            await api.patch(
                `/branches/${id}/enable`
            );


        return response.data.data;

    };


/*
============================================================
SET DEFAULT BRANCH
============================================================

The existing backend updateBranch() already supports:

{
    isDefault: true
}

and performs the switch transactionally.
============================================================
*/

const setDefaultBranch =
    async (
        id
    ) => {

        return updateBranch(
            id,
            {
                isDefault:
                    true,
            }
        );

    };


export default {

    getAccessibleBranches,

    getActiveBranch,

    getDefaultBranch,

    getBranches,

    getBranchById,

    createBranch,

    updateBranch,

    disableBranch,

    enableBranch,

    setDefaultBranch,

};
import Product
    from "../models/product.model.js";

import BranchInventory
    from "../models/branchInventory.model.js";

import {
    connectCloudDatabase,
    getCloudConnection,
    isCloudConnected,
}
from "../config/cloudDatabase.js";

import ApiError
    from "../utils/ApiError.js";


/*
============================================================
REQUIRE CLOUD CONNECTION
============================================================
*/

const requireCloudConnection =
    async () => {

        if (
            !isCloudConnected()
        ) {

            await connectCloudDatabase();

        }


        const connection =
            getCloudConnection();


        if (
            !connection
        ) {

            throw new ApiError(
                503,
                "Online product catalog is currently unavailable."
            );

        }


        return connection;

    };


/*
============================================================
GET CLOUD MODEL
============================================================
*/

const getCloudModel =
    (
        connection,
        modelName,
        schema,
        collectionName
    ) => {

        if (
            connection.models[
                modelName
            ]
        ) {

            return connection.models[
                modelName
            ];

        }


        return connection.model(
            modelName,
            schema,
            collectionName
        );

    };


/*
============================================================
GET CLOUD PRODUCT MODEL
============================================================
*/

const getCloudProductModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "Product",
            Product.schema,
            Product.collection.name
        );

    };


/*
============================================================
GET CLOUD BRANCH INVENTORY MODEL
============================================================
*/

const getCloudBranchInventoryModel =
    async () => {

        const connection =
            await requireCloudConnection();


        return getCloudModel(
            connection,
            "BranchInventory",
            BranchInventory.schema,
            BranchInventory.collection.name
        );

    };


/*
============================================================
GET MOBILE PRODUCTS
============================================================

Product catalog:
→ global

Stock:
→ branch-specific BranchInventory

IMPORTANT:

Product.stock is legacy.

The response field "stock" is intentionally replaced with
the selected branch's BranchInventory.stock value.
============================================================
*/

const getProducts =
    async ({
        branchId,
        search = "",
        category = "",
    }) => {

        if (
            !branchId
        ) {

            throw new ApiError(
                400,
                "Active branch is required."
            );

        }


        const [
            CloudProduct,
            CloudBranchInventory,
        ] =
            await Promise.all([

                getCloudProductModel(),

                getCloudBranchInventoryModel(),

            ]);


        /*
        ========================================================
        PRODUCT FILTER
        ========================================================

        Only active products are shown on the mobile order
        builder.
        ========================================================
        */

        const productFilter = {

            isActive:
                true,

        };


        /*
        ========================================================
        CATEGORY FILTER
        ========================================================
        */

        const normalizedCategory =
            String(
                category ||
                ""
            ).trim();


        if (
            normalizedCategory &&
            normalizedCategory !==
                "All"
        ) {

            productFilter.category =
                normalizedCategory;

        }


        /*
        ========================================================
        SEARCH
        ========================================================

        Supports:

        - barcode
        - product name
        - description

        Regex input is escaped first so user input cannot alter
        the regex expression.
        ========================================================
        */

        const normalizedSearch =
            String(
                search ||
                ""
            ).trim();


        if (
            normalizedSearch
        ) {

            const escapedSearch =
                normalizedSearch.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


            const searchRegex =
                new RegExp(
                    escapedSearch,
                    "i"
                );


            productFilter.$or =
                [

                    {
                        barcode:
                            searchRegex,
                    },

                    {
                        name:
                            searchRegex,
                    },

                    {
                        description:
                            searchRegex,
                    },

                ];

        }


        /*
        ========================================================
        LOAD GLOBAL PRODUCTS
        ========================================================
        */

        const products =
            await CloudProduct
                .find(
                    productFilter
                )
                .sort({

                    name:
                        1,

                })
                .lean();


        if (
            products.length ===
            0
        ) {

            return [];

        }


        const productIds =
            products.map(
                (
                    product
                ) =>
                    product._id
            );


        /*
        ========================================================
        LOAD SELECTED BRANCH INVENTORY
        ========================================================
        */

        const inventories =
            await CloudBranchInventory
                .find({

                    branch:
                        branchId,

                    product: {
                        $in:
                            productIds,
                    },

                })
                .lean();


        const inventoryMap =
            new Map(
                inventories.map(
                    (
                        inventory
                    ) => [

                        String(
                            inventory.product
                        ),

                        inventory,

                    ]
                )
            );


        /*
        ========================================================
        BUILD MOBILE PRODUCT RESPONSE
        ========================================================
        */

        return products.map(
            (
                product
            ) => {

                const inventory =
                    inventoryMap.get(
                        String(
                            product._id
                        )
                    ) ||
                    null;


                const inventoryConfigured =
                    Boolean(
                        inventory
                    );


                const inventoryActive =
                    Boolean(
                        inventory &&
                        inventory.isActive !==
                            false
                    );


                const stock =
                    inventoryConfigured &&
                    inventoryActive
                        ? Math.max(
                            Number(
                                inventory.stock ||
                                0
                            ),
                            0
                        )
                        : 0;


                const minimumStock =
                    inventoryConfigured
                        ? Math.max(
                            Number(
                                inventory.minimumStock ||
                                0
                            ),
                            0
                        )
                        : 0;


                /*
                ====================================================
                PRICING
                ====================================================

                Send all pricing tiers.

                The phone can display pricing immediately, but
                PreparedCart creation and desktop claim will still
                revalidate it server-side.
                ====================================================
                */

                const pricing =
                    Array.isArray(
                        product.pricing
                    )
                        ? [
                            ...product.pricing,
                        ]
                            .map(
                                (
                                    tier
                                ) => ({

                                    quantity:
                                        Number(
                                            tier.quantity
                                        ),

                                    price:
                                        Number(
                                            tier.price
                                        ),

                                })
                            )
                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    a.quantity -
                                    b.quantity
                            )
                        : [];


                return {

                    _id:
                        product._id,

                    barcode:
                        product.barcode,

                    name:
                        product.name,

                    description:
                        product.description ||
                        "",

                    category:
                        product.category,

                    baseUnit:
                        product.baseUnit,

                    pricing,


                    /*
                    ================================================
                    BRANCH INVENTORY
                    ================================================
                    */

                    stock,

                    minimumStock,

                    branchInventoryConfigured:
                        inventoryConfigured,

                    branchInventoryActive:
                        inventoryActive,


                    /*
                    ================================================
                    PRODUCT STATUS
                    ================================================
                    */

                    isActive:
                        product.isActive,

                };

            }
        );

    };


/*
============================================================
GET MOBILE PRODUCT BY BARCODE
============================================================

Useful for the phone camera/barcode scanner.

This still validates branch inventory.
============================================================
*/

const getProductByBarcode =
    async ({
        branchId,
        barcode,
    }) => {

        const normalizedBarcode =
            String(
                barcode ||
                ""
            ).trim();


        if (
            !normalizedBarcode
        ) {

            throw new ApiError(
                400,
                "Barcode is required."
            );

        }


        const [
            CloudProduct,
            CloudBranchInventory,
        ] =
            await Promise.all([

                getCloudProductModel(),

                getCloudBranchInventoryModel(),

            ]);


        const product =
            await CloudProduct
                .findOne({

                    barcode:
                        normalizedBarcode,

                    isActive:
                        true,

                })
                .lean();


        if (
            !product
        ) {

            throw new ApiError(
                404,
                "Product not found."
            );

        }


        const inventory =
            await CloudBranchInventory
                .findOne({

                    branch:
                        branchId,

                    product:
                        product._id,

                })
                .lean();


        const inventoryConfigured =
            Boolean(
                inventory
            );


        const inventoryActive =
            Boolean(
                inventory &&
                inventory.isActive !==
                    false
            );


        const stock =
            inventoryConfigured &&
            inventoryActive
                ? Math.max(
                    Number(
                        inventory.stock ||
                        0
                    ),
                    0
                )
                : 0;


        const minimumStock =
            inventoryConfigured
                ? Math.max(
                    Number(
                        inventory.minimumStock ||
                        0
                    ),
                    0
                )
                : 0;


        const pricing =
            Array.isArray(
                product.pricing
            )
                ? [
                    ...product.pricing,
                ]
                    .map(
                        (
                            tier
                        ) => ({

                            quantity:
                                Number(
                                    tier.quantity
                                ),

                            price:
                                Number(
                                    tier.price
                                ),

                        })
                    )
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.quantity -
                            b.quantity
                    )
                : [];


        return {

            _id:
                product._id,

            barcode:
                product.barcode,

            name:
                product.name,

            description:
                product.description ||
                "",

            category:
                product.category,

            baseUnit:
                product.baseUnit,

            pricing,

            stock,

            minimumStock,

            branchInventoryConfigured:
                inventoryConfigured,

            branchInventoryActive:
                inventoryActive,

            isActive:
                product.isActive,

        };

    };


/*
============================================================
EXPORT
============================================================
*/

export default {

    getProducts,

    getProductByBarcode,

};
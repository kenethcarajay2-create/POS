import {
    useEffect,
    useRef,
} from "react";

import useProductStore from "../../store/product.store";


function SearchBar({
    clearTrigger,
}) {

    /*
    ============================================================
    PRODUCT STORE
    ============================================================
    */

    const search =
        useProductStore(
            (state) =>
                state.search
        );


    const setSearch =
        useProductStore(
            (state) =>
                state.setSearch
        );


    /*
    ============================================================
    SEARCH INPUT REF
    ============================================================
    */

    const searchInputRef =
        useRef(null);


    /*
    ============================================================
    F4 CLEAR SEARCH
    ============================================================

    Whenever POSPage changes clearTrigger:

    1. Clear the product search
    2. Put focus back into the search box
    ============================================================
    */

    useEffect(
        () => {

            /*
            Do not run the F4 behavior on the initial mount.
            */

            if (
                !clearTrigger
            ) {

                return;

            }


            setSearch(
                ""
            );


            /*
            Return focus to search input.
            */

            requestAnimationFrame(
                () => {

                    searchInputRef
                        .current
                        ?.focus();

                }
            );

        },
        [
            clearTrigger,
            setSearch,
        ]
    );


    /*
    ============================================================
    RENDER
    ============================================================
    */

    return (

        <input
            ref={
                searchInputRef
            }

            type="text"

            className="
                input
                input-bordered
                w-full
            "

            placeholder="Search or scan barcode..."

            value={
                search
            }

            onChange={(
                event
            ) =>
                setSearch(
                    event.target.value
                )
            }

            autoComplete="off"
        />

    );

}


export default SearchBar;
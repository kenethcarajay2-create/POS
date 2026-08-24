import useCartStore from "../../store/cart.store";


function ShortcutBar() {

    const wholesaleMode =
        useCartStore(
            (state) =>
                state.wholesaleMode
        );


    return (

        <div
            className="
                w-full
                h-full
                flex
                items-center
                justify-center
                gap-6
                px-4
            "
        >

            {/* =========================================
                CHECKOUT
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F2
                </kbd>

                <span className="text-sm">
                    Checkout
                </span>

            </div>


            {/* =========================================
                CLEAR SEARCH
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F4
                </kbd>

                <span className="text-sm">
                    Clear Search
                </span>

            </div>


            {/* =========================================
                GROCERY / OPEN PRICE
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F6
                </kbd>

                <span className="text-sm">
                    Grocery
                </span>

            </div>


            {/* =========================================
                QUANTITY
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F7
                </kbd>

                <span className="text-sm">
                    Quantity
                </span>

            </div>


            {/* =========================================
                HOLD SALE
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F8
                </kbd>

                <span className="text-sm">
                    Hold Sale
                </span>

            </div>


            {/* =========================================
                RESUME SALE
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F9
                </kbd>

                <span className="text-sm">
                    Resume Sale
                </span>

            </div>


            {/* =========================================
                CLEAR CART
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F10
                </kbd>

                <span className="text-sm">
                    Clear Cart
                </span>

            </div>


            {/* =========================================
                WHOLESALE MODE
            ========================================= */}

            <div className="flex items-center gap-2">

                <kbd className="kbd kbd-sm">
                    F11
                </kbd>

                <span className="text-sm">

                    {wholesaleMode
                        ? "Normal Pricing"
                        : "Wholesale"}

                </span>

            </div>

        </div>

    );

}


export default ShortcutBar;
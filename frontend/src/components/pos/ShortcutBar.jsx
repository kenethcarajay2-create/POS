import useCartStore from "../../store/cart.store";
function ShortcutBar() {
       const wholesaleMode = useCartStore(
        (state) => state.wholesaleMode
    );
    return (
        <div className="
            w-full
            h-full
            flex
            items-center
            justify-center
            gap-8
            px-4
        ">

            {/* Checkout */}
            <div className="flex items-center gap-2">
                <kbd className="kbd kbd-sm">
                    F2
                </kbd>

                <span className="text-sm">
                    Checkout
                </span>
            </div>


            {/* Quantity */}
            <div className="flex items-center gap-2">
                <kbd className="kbd kbd-sm">
                    F7
                </kbd>

                <span className="text-sm">
                    Quantity
                </span>
            </div>


            {/* Hold Sale */}
            <div className="flex items-center gap-2">
                <kbd className="kbd kbd-sm">
                    F8
                </kbd>

                <span className="text-sm">
                    Hold Sale
                </span>
            </div>


            {/* Resume Sale */}
            <div className="flex items-center gap-2">
                <kbd className="kbd kbd-sm">
                    F9
                </kbd>

                <span className="text-sm">
                    Resume Sale
                </span>
            </div>


            {/* Clear Cart */}
            <div className="flex items-center gap-2">
                <kbd className="kbd kbd-sm">
                    F10
                </kbd>

                <span className="text-sm">
                    Clear Cart
                </span>
            </div>

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
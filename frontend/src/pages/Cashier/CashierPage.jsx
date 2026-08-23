import SearchBar from "../../components/cashier/SearchBar";
import ProductGrid from "../../components/cashier/ProductGrid";
import Cart from "../../components/cashier/Cart";
import OrderSummary from "../../components/cashier/OrderSummary";

function CashierPage() {
    return (
        <div className="h-full flex gap-6">

            {/* Left */}
            <div className="flex-1 flex flex-col gap-5">

                <SearchBar />

                <ProductGrid />

            </div>

            {/* Right */}
            <div className="w-96 flex flex-col gap-5">

                <Cart />

                <OrderSummary />

            </div>

        </div>
    );
}

export default CashierPage;
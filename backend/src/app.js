import express from "express";
import cors from "cors";
import ApiResponse from "./utils/ApiResponse.js";
import errorHandler from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import protect from "./middleware/auth.middleware.js";
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/product.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js"
import saleRoutes from "./routes/sale.routes.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import printerRoutes
    from "./routes/printer.routes.js";

import ledgerRoutes from "./routes/ledger.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import customerRoutes from "./routes/customer.routes.js";



import path from "path";


const app = express();

app.use(cors());
app.use(express.json());

app.use(
    "/uploads",
    express.static(
        path.join(
            process.cwd(),
            "uploads"
        )
    )
);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);
app.use(
    "/api/dashboard",
    dashboardRoutes
);
app.use(
    "/api/printer",
    printerRoutes
);
app.use(
    "/api/ledger",
    ledgerRoutes
);


app.get("/api/health", (req, res) => {
    res.status(200).json(
        new ApiResponse(
            true,
            "StorePOS API is running"
        )
    );
});

app.get("/api/profile", protect, (req, res) => {
    res.json(
        new ApiResponse(
            true,
            "Profile retrieved successfully",
            req.user
        )
    );
});



app.use("/api/auth", authRoutes);
app.use(
    "/api/sync",
    syncRoutes
);
app.use(
    "/api/customers",
    customerRoutes
);

app.use(errorHandler);

export default app;
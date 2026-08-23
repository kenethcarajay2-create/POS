import printerService from "../services/printer.service.js";

const testPrint = async (req, res, next) => {

    try {

        const result =
            printerService.testPrint();

        res.status(200).json({
            success: true,
            message: "Printer test sent successfully.",
            result,
        });

    } catch (error) {

        next(error);

    }

};

const openCashDrawer = async (req, res, next) => {

    try {

        const result =
            printerService.openCashDrawer();

        res.status(200).json({
            success: true,
            message:
                "Cash drawer command sent.",
            result,
        });

    } catch (error) {

        next(error);

    }
};

export default {
    testPrint, openCashDrawer
};
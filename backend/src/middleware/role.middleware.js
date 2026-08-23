const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            const error = new Error("Forbidden");
            error.statusCode = 403;
            return next(error);
        }

        next();
    };
};

export default authorize;
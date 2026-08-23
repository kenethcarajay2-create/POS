const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            error.statusCode = 400;
            return next(error);
        }

        req.body = value;

        next();
    };
};

export default validate;
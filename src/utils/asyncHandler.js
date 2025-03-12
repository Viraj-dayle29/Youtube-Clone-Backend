// Promisified version of aync Handler

const asyncHandler = (requestHandler) => async(req,res,next) => {
    return Promise.resolve(requestHandler(req,res,next)).catch(error => next(error));
}

// Async try catch version

/* function asyncHandler( fun ){
    return async(req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            res.status(err.code || 5000).json({
                succes: false,
                message: err.message,
            })
        }
    }
}
 */

/* 
const asyncHandler = (fn) => async (req,res,next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(err.code || 5000).json({
            succes: false,
            message: err.message,
        })
    }
} */

export {asyncHandler}

// function asyncHandler( fun ){
//     return async(req, res, next) => {
//         try {
//             await fn(req, res, next);
//         } catch (error) {
//             res.status(err.code || 5000).json({
//                 succes: false,
//                 message: err.message,
//             })
//         }
//     }
// }

// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(err.code || 5000).json({
//             succes: false,
//             message: err.message,
//         })
//     }
// }
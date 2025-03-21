import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken} from "../controllers/users.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Routing and assigning function by method and use multer upload for files
router.route('/register').post(
    // add file upload because we use multer middleware
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

// Secured routes
router.route('/login').post(loginUser);

router.route('/logout').post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken)
export default router


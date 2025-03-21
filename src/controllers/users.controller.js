import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { uploadFileCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) => {

    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token.")
    }
}   

// create controller function
const registerUser = asyncHandler(async(req,res)=>{

    // getting info from user
    const {userName, email, password, fullName} = req.body;

    // check any null value
    if(
        [userName, email, password, fullName].some((fields) => fields?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required!")
    }

    // check if already user exist
    const exsitedUser = await User.findOne({
        $or: [{userName},{email}]
    })

    // give error if already user exist
    if(exsitedUser){
        throw new ApiError(409, "User with this email or username already exist.")
    }

    // take a file by multer
    if(!req.files || !req.files.avatar || !req.files.avatar[0]?.path){
        throw new ApiError(400, "Avatar file is required");
    }
    
    let avatarLocalPath = req.files.avatar[0].path;
    let coverImageLocalPath = req.files.coverImage?.[0]?.path;
    // upload file on cloudinary
    const avatar = await uploadFileCloudinary(avatarLocalPath);
    const coverImage = await uploadFileCloudinary(coverImageLocalPath);

    // check clodinary file exist or not
    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    // store all info in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || null,
        email,
        password,
        userName: userName.toLowerCase()
    })

    // remove password and refreshtoken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // if user not create give error
    if(!createdUser){
        console.log("Succesfull")
        throw new ApiError(500, "Something went wrong by registering the user.")
    }

    // return response 
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User succesfully created")
    )
})

// login user
const loginUser = asyncHandler(async(req,res)=>{
    // get detail from body in json not form because we cant use multer
    const {email, userName, password} = req.body;
    
    // check one of the detail mandatory
    if(!(userName || email)){
        throw new ApiError(400, "username or password is required x");
    }

    // get user
    const user = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(!user){
        throw new ApiError(404,"User doesn't exist.")
    }

    // check password by method
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials.");
    }

    // generate access token and refresh token
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    // send response and cookies
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User loggedin succesfully"
        )
    )
})

// logout
const logoutUser = asyncHandler(async(req, res) => {
    // we use middleware then we directly get re1.user._id
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken : undefined,
            }
        },
        {
            new: true
        },
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    // send response delete cookies
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out!"))
})

// refresh access token
const refreshAccessToken = asyncHandler(async(req, res) =>{
    // get token from cookies
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(400, "Unauthorized request!")
    }
    console.log("incomingRefreshToken",incomingRefreshToken)
    // decode by jwt
    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        ); 
    
        const user = await User.findById(decodeToken?._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }
        
        // check with data base token 
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(400, "Invalid token")
        }
    
        // generate new token
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id); 
    
        const options = {
            httpOnly: true,
            secure: true
        }
        console.log(accessToken, newRefreshToken);
        // send response to the user 
        return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(
            200,
            {
                accessToken, refreshToken: newRefreshToken
            },
            "Access token refresh"
        ))
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res) =>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(404, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password change succesfully"))
})

const getCurrentUser = asyncHandler(async(req, res) =>{
    const user = await User.findById(req.user?._id);
    if(!user){
        throw new ApiError(404, "No current user")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, user, "current user fetched"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {email, fullName} = req.body;

    if(!email || !fullName){
        throw new ApiError(404, "All fieds are mandatory")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                email,
                fullName
            }
        },
        { new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated succesfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) =>{
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(404, "avatar image file is missing")
    }

    const avatar = await uploadFileCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(404, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar update successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) =>{
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(404, "Cover image file is missing")
    }

    const coverImage = await uploadFileCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(404, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage: coverImage.url,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "coverImage update successfully")
    )
})

export {
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}
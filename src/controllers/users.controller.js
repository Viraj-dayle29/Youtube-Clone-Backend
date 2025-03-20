import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { uploadFileCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAceessAndRefreshToken = async(userId) => {

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

const loginUser = asyncHandler(async(req,res)=>{
    console.log("Request Body:", req.body);
    const {email, userName, password} = req.body;
    console.log(userName, password)
    if(!(userName || email)){
        throw new ApiError(400, "username or password is required x");
    }

    const user = await User.findOne({
        $or: [{userName}, {email}]
    })

    if(!user){
        throw new ApiError(404,"User doesn't exist.")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials.");
    }

    const {accessToken, refreshToken} = await
    generateAceessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

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

const logoutUser = asyncHandler(async(req, res) => {
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

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out!"))
})

export {registerUser, loginUser, logoutUser}
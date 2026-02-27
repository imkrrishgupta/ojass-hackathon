import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(
            localFilePath, {
                resource_type: "image"
            }
        )
        
        if (process.env.NODE_ENV !== "production"){
            console.log("File uploaded on cloudinary")
        }

        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        console.log("Error on cloudinary ", error)
        fs.unlinkSync(localFilePath);
        return null;

    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Deleted from cloudinary. Public id", publicId);

    } catch (error) {
        console.log("Error deleting from cloudinary", error);
        return null;

    }
}

export {uploadOnCloudinary, deleteFromCloudinary};
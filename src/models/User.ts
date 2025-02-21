import mongoose from "mongoose";

export interface IUser {
  userName: string; // Add this line
  email: string;
  password: string;
  profilePictureUrl?: string;
  _id?: string;
  refreshTokens?: string[];
}

const userSchema = new mongoose.Schema<IUser>({
  userName: {
    // Add this line
    type: String, // Add this line
    required: true, // Add this line
    unique: true, // Add this line
  }, // Add this line
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profilePictureUrl: {
    type: String,
    default: "",
  },
  refreshTokens: {
    type: [String],
    default: [],
  },
});

const userModel = mongoose.model<IUser>("User", userSchema);

export default userModel;

import mongoose from "mongoose";

export interface IUser {
  _id?: string;
  userName: string;
  email: string;
  password: string;
  googleId?: string; // Optional
  profilePictureUrl?: string;
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
    required: function () {
      return !this.googleId; // Password required only if no Google login
    },
  },
  googleId: {
    // Add this field for Google users
    type: String,
    unique: true,
    sparse: true, // Allows some users to not have this field
  },
  profilePictureUrl: {
    type: String,
    default: "http://localhost:3000/public/default_profile.png",
  },
  refreshTokens: {
    type: [String],
    default: [],
    required: true,
  },
});

const userModel = mongoose.model<IUser>("User", userSchema);

export default userModel;

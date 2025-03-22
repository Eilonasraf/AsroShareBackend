/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/User";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import axios from "axios";
import FormData from "form-data";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User";

type Payload = {
  _id: string;
};

const client = new OAuth2Client();

// Google Signin: Called immediately when a user logs in with Google
const googleSignin = async (req: Request, res: Response): Promise<void> => {
  // Sensitive logging removed
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      res.status(400).send("Google authentication failed: No email found.");
      return;
    }
    // Check if a user with this email already exists
    let user = await User.findOne({ email });
    if (!user) {
      // Derive a username from email
      const derivedUserName = email.split("@")[0] || "New User";
      // Check if that derived username already exists
      const existingUserName = await User.findOne({
        userName: derivedUserName,
      });
      if (existingUserName) {
        // Conflict: send a 409 so the frontend can prompt for a new username
        res.status(409).json({
          error: "Username already exists",
          message: "Please choose another username",
          email,
          suggestedUserName: derivedUserName,
        });
        return;
      }
      // Username is available; create a new Google user
      user = await User.create({
        email,
        userName: derivedUserName,
        googleId: payload.sub,
        profilePictureUrl: payload?.picture,
      });
    }
    // Generate tokens using the helper function
    const tokens = await GoogleGenerateTokens(user);
    if (!tokens) {
      res.status(500).send("Error generating tokens");
      return;
    }
    // Save the refresh token
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();
    res.status(200).json({
      userName: user.userName,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
      _id: user._id,
      ...tokens,
    });
  } catch (err) {
    console.error("Google sign-in error:", err);
    res.status(500).send("Internal Server Error");
  }
};

const GoogleGenerateTokens = async (user: any) => {
  const random = Math.floor(Math.random() * 1000000);
  if (!process.env.TOKEN_SECRET) {
    return null;
  }
  const accessToken = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      random,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION } as SignOptions
  );
  const refreshToken = jwt.sign(
    {
      _id: user._id,
      random,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION } as SignOptions
  );
  return { accessToken, refreshToken };
};

// Google Complete: Called when a Google user’s default username conflicts.
// The frontend will call this endpoint (after the user enters a new username)
const googleComplete = async (req: Request, res: Response): Promise<void> => {
  const { credential, newUsername } = req.body;
  if (!credential || !newUsername) {
    res.status(400).json({ error: "Credential and newUsername are required." });
    return;
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      res
        .status(400)
        .json({ error: "Google authentication failed: No email found." });
      return;
    }
    // Check if the chosen new username is already taken
    const usernameTaken = await User.findOne({ userName: newUsername });
    if (usernameTaken) {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    // Find the user by email, or create one if needed
    let user = await User.findOne({ email });
    if (user) {
      // Update the existing user's username
      user.userName = newUsername;
    } else {
      // Create a new user with the chosen username
      user = await User.create({
        email,
        userName: newUsername,
        googleId: payload?.sub,
        profilePictureUrl: payload?.picture || "default_profile.png",
      });
    }
    const tokens = await GoogleGenerateTokens(user);
    if (!tokens) {
      res.status(500).json({ error: "Error generating tokens" });
      return;
    }
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();
    res.status(200).json({
      userName: user.userName,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
      _id: user._id,
      ...tokens,
    });
  } catch (err) {
    console.error("Error in googleComplete:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const register = async (req: Request, res: Response) => {
  const { email, userName, password } = req.body;
  // 'profilePicture' comes from the multer middleware (field name should match client-side)
  const profilePicture = req.file as Express.Multer.File;

  console.log("Received:", { userName, email, password, profilePicture });

  if (!userName || !email || !password) {
    res.status(400).send("Email, username, and password required");
    return;
  }

  try {
    const existingUser = await userModel.findOne({ userName: userName });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }
  } catch (error) {
    console.error("Error checking for existing user:", error);
    return res.status(500).json({ error: "Server error" });
  }

  try {
    const existingEmail = await userModel.findOne({ email: email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" });
    }
  } catch (error) {
    console.error("Error checking for existing email:", error);
    return res.status(500).json({ error: "Server error" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    let profilePictureUrl = "default_profile.png";

    if (profilePicture) {
      // Create a FormData instance for forwarding the file
      const fileFormData = new FormData();
      // Append the file buffer with the field name 'file' to match the upload route
      fileFormData.append(
        "file",
        profilePicture.buffer,
        profilePicture.originalname
      );

      try {
        const response = await axios.post(
          (process.env.DOMAIN_BASE || "") + process.env.PORT + "/api/file",
          fileFormData,
          {
            headers: {
              // formData.getHeaders() sets the correct multipart headers
              ...fileFormData.getHeaders(),
            },
          }
        );
        console.log("File upload response:", response.data);
        profilePictureUrl = response.data.url;
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }

    const newUser: IUser = await userModel.create({
      userName: userName,
      email: email,
      password: hashedPassword,
      profilePictureUrl: profilePictureUrl,
    });

    res.status(200).send({
      userName: newUser.userName,
      email: newUser.email,
      profilePictureUrl: newUser.profilePictureUrl,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).send("Error registering user");
  }
};

const generateTokens = (
  _id: string
): { accessToken: string; refreshToken: string } | null => {
  const random = Math.floor(Math.random() * 1000000);

  if (!process.env.TOKEN_SECRET) {
    return null;
  }
  const accessToken = jwt.sign(
    {
      _id: _id,
      random: random,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION } as SignOptions
  );

  const refreshToken = jwt.sign(
    {
      _id: _id,
      random: random,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION } as SignOptions
  );
  return { accessToken, refreshToken };
};

const login = async (req: Request, res: Response) => {
  const { userName, password } = req.body;
  console.log("Received:", { reqBody: req.body });
  if (!userName || !password) {
    res.status(400).send("Wrong username or password");
    return;
  }
  try {
    const user = await userModel.findOne({ userName: userName });
    if (!user) {
      res.status(400).send("Wrong username or password");
      return;
    }
    const validPassword = await bcrypt.compare(password, user.password); // returns true or false
    if (!validPassword) {
      res.status(400).send("Invalid password");
      return;
    }

    const tokens = generateTokens(user._id);

    if (!tokens) {
      res.status(500).send("Error generating tokens");
      return;
    }

    const { accessToken, refreshToken } = tokens;

    // Allow multiple devices by storing multiple refresh tokens
    if (user.refreshTokens == null) {
      user.refreshTokens = [];
    }
    user.refreshTokens.push(refreshToken); // Store multiple refresh tokens
    await user.save();

    res.status(200).send({
      userName: user.userName,
      email: user.email,
      profilePictureUrl:
        (process.env.DOMAIN_BASE || "") +
        process.env.PORT +
        "/public/" +
        user.profilePictureUrl,
      _id: user._id,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).send("Error logging in");
    return;
  }
};

const refresh = async (req: Request, res: Response) => {
  // validate refresh token
  const { refreshToken } = req.body;
  console.log("refreshToken:", refreshToken);

  if (!refreshToken) {
    res.status(400).send("Invalid refresh token");
    return;
  }
  if (!process.env.TOKEN_SECRET) {
    res.status(400).send("Token secret not set");
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwt.verify(
    refreshToken,
    process.env.TOKEN_SECRET,
    async (err: any, payload: any) => {
      if (err) {
        res.status(403).send("Invalid token");
        return;
      }
      //  find the user by refresh token
      const userId = (payload as Payload)._id;
      try {
        const user = await userModel.findById(userId);
        if (!user) {
          res.status(404).send("Invalid token");
          return;
        }

        // Ensure the refresh token exists before replacing it
        if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
          user.refreshTokens = []; // Clear tokens if an invalid refresh token is used
          await user.save();
          return res.status(400).send("Invalid refresh token");
        }

        // generate a new tokens
        const newTokens = generateTokens(user._id);
        if (!newTokens) {
          user.refreshTokens = [];
          await user.save();
          res.status(500).send("Error generating tokens");
          return;
        }

        // Replace only the used refresh token with the new one
        user.refreshTokens = user.refreshTokens.filter(
          (token) => token !== refreshToken
        );
        user.refreshTokens.push(newTokens.refreshToken);
        await user.save();

        // return the new access token and refresh token
        res.status(200).send({
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        });
        return;
      } catch (error) {
        console.error(error);
        res.status(500).send("Error refreshing token");
        return;
      }
    }
  );
};

const logout = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).send("Refresh token required");
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jwt.verify(
    refreshToken,
    process.env.TOKEN_SECRET as string,
    async (err: any, payload: any) => {
      if (err) {
        res.status(403).send("Invalid token");
        return;
      }
      const userId = (payload as Payload)._id;
      try {
        let user = await userModel.findById(userId);
        // Check if user exists
        if (!user) {
          console.error("Logout failed: User not found.");
          res.status(404).send("Invalid Token");
          return;
        }

        console.log("Before logout (MongoDB):", user.refreshTokens);
        console.log("Refresh token to remove:", `"${refreshToken.trim()}"`);

        // Ensure refreshTokens is always an array before filtering
        if (!Array.isArray(user.refreshTokens)) {
          user.refreshTokens = [];
        }

        // Normalize token formatting before filtering
        user.refreshTokens = user.refreshTokens.map((token) => token.trim());
        const cleanedToken = refreshToken.trim();

        console.log("Processed tokens for filtering:", user.refreshTokens);
        console.log("Processed token to remove:", cleanedToken);

        // Remove the refresh token used for logout
        const updatedTokens = user.refreshTokens.filter(
          (token) => token !== cleanedToken
        );

        console.log(
          "After filtering (before saving to MongoDB):",
          updatedTokens
        );

        // Force MongoDB to update with `findByIdAndUpdate`
        user = await userModel.findByIdAndUpdate(
          userId,
          { $set: { refreshTokens: updatedTokens } },
          { new: true }
        );

        console.log("After logout (MongoDB):", user?.refreshTokens);

        return res.status(200).send("Logged out");

        // Added
      } catch (error) {
        console.error(error);
        res.status(500).send("Error logging out");
        return;
      }
    }
  );
};

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    res.status(401).send("Access denied");
    return;
  }
  if (!process.env.TOKEN_SECRET) {
    res.status(400).send("Token secret not set");
    return;
  }
  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    if (err) {
      res.status(403).send("Invalid token");
      return;
    }
    req.params.userId = (payload as Payload)._id;
    next();
  });
};

export { generateTokens };

export default {
  register,
  googleComplete,
  googleSignin,
  login,
  refresh,
  logout,
};

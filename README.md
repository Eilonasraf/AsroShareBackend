# AstroShare - Final Course Project

AstroShare is a full-stack web application built using **Node.js (Express with TypeScript using the MVC model)** for the backend and **React with TypeScript** for the frontend. The project was developed as a collaborative final course project and follows a modular, secure, and scalable architecture.

## 🌐 Live Access
The application is deployed in **production mode** with HTTPS and is accessible via the domain provided by our instructor. It runs in the background using **PM2**, ensuring stability even when the terminal is closed.

---

## 🛠 Tech Stack
- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express (MVC) + TypeScript
- **Database**: MongoDB (self-hosted with credentials)
- **Authentication**: JWT (Access + Refresh Tokens) + Google Login
- **Testing**: Unit tests for all internal APIs using Jest
- **Documentation**: Swagger API Docs
- **Deployment**: PM2, HTTPS (no external hosting)

---

## 📁 Repositories
- [AstroShare Backend](https://github.com/Eilonasraf/AsroShareBackend)
- [AstroShare Frontend](https://github.com/Eilonasraf/AsroShareFrontend)

---

## 🔐 Authentication
- Standard registration/login with username and password
- OAuth login via Google
- JWT-based authentication (Access & Refresh tokens)
- Session persistence and logout capability

---

## 👤 User Profile
- Displays user details including profile picture
- Shows all posts by the user
- Allows the user to update profile picture and username

---

## 🧭 Astro + Trips Wall
AstroShare combines an astronomy content feed with a social trip-sharing wall:
- Users can create "trip posts" with location, image, and description
- When uploading a trip, a fun astronomical fact is fetched using **Gemini AI** based on the location
- Everyone can view, like, and comment on shared trips
- Infinite scroll with paging for the trip feed

---

## 📤 Content Sharing Features
- Users can create posts with image and text
- Other users can view all posts
- Users can edit/delete their own posts
- Dedicated screen for "My Posts"
- Infinite scroll with paging for content feed

---

## 💬 Comments & Likes
- Each post supports comments (shown in a separate screen)
- The number of comments is visible in the main feed
- Users can like posts
- All reactions are persisted in MongoDB

---

## 🔧 Project Infrastructure
- Git is used with each contributor using personal profiles
- Followed Gitflow with **branches and pull requests**
- API documented using **Swagger**
- Unit tests written for all internal APIs (excluding 3rd-party APIs)
- Images stored on the server filesystem (not in DB or external service)

---

## 🎨 UI/UX Design
- Custom-designed screens
- Proper use of colors, layouts, screen space
- Responsive and accessible design

---

## 🚀 Production & Deployment
- Application is deployed in **production mode** on a dedicated server within the college infrastructure
- MongoDB instance is self-hosted and secured with username/password
- Both frontend and backend accessible via instructor-assigned domain without port

---

## 📜 License
This project was built as part of an academic course and is for educational purposes only.

---

Thank you for visiting our project!

# The Hotel Booking Platform - Backend

## 🌍 Live API Endpoint
[https://the-hotel-server.vercel.app/](#)

## 📌 Project Overview
This is the **backend API** for the **Hotel Booking Platform**, a robust and secure server built with **Node.js and Express.js**. It handles user authentication, room booking management, and data retrieval from a **MongoDB** database. The server follows RESTful principles and uses **JWT authentication** for secure user access.

## 🚀 Features
### 🔹 Authentication
- **JWT-based authentication** to protect user routes.
- **Cookie-based token storage** for security.
- **User role management** (e.g., Admin, Customer).

### 🔹 Booking System
- **Room availability check before booking.**
- **Bookings stored securely in MongoDB.**
- **Cancellation & rescheduling of bookings.**
- **Booking history retrieval for users.**

### 🔹 User Reviews & Ratings
- **Authenticated users can post reviews.**
- **Average rating calculated dynamically.**
- **Reviews linked to specific rooms.**

### 🔹 API Security & Middleware
- **CORS configured for cross-origin requests.**
- **Cookie Parser for secure cookie handling.**
- **Environment variables managed with `dotenv`.**

## 🛠️ Tech Stack
### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Fast and lightweight backend framework
- **MongoDB** - NoSQL database for storing user, booking, and room data
- **JWT** - Secure user authentication
- **dotenv** - Environment variable management
- **CORS & Cookie Parser** - Secure request handling

## 📦 Installation & Setup
### **1️⃣ Clone the Repository**
```sh
git clone https://github.com/shahedul-alam/the-hotel-server.git
cd the-hotel-server
```
### **2️⃣ Install Dependencies**
```sh
npm install
```
### **3️⃣ Create `.env` File**
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```
### **4️⃣ Start the Server**
```sh
npm start
```

## 🚀 Deployment
You can deploy this backend using **Render, Railway, or Vercel**.
### **Deploy to Render** *(Example)*
1. Push your code to GitHub.
2. Create a new service in [Render](https://render.com/).
3. Add environment variables from `.env`.
4. Deploy & get your live API URL.

## 📜 API Endpoints
### **Authentication Routes**
| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user & generate JWT |
| `POST` | `/api/auth/logout` | Logout user & clear cookies |

### **Booking Routes**
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/bookings` | Get all bookings |
| `POST` | `/api/bookings` | Create a new booking |
| `PATCH` | `/api/bookings/:id` | Update a booking |
| `DELETE` | `/api/bookings/:id` | Cancel a booking |

### **Room Routes**
| Method | Endpoint | Description |
|--------|---------|-------------|
| `GET` | `/api/rooms` | Get all rooms |
| `GET` | `/api/rooms/top-rated` | Get top 6 highest-rated rooms |
| `GET` | `/api/rooms/:id` | Get room details |

## 📝 Author
Developed by **Shahedul Alam**  
📧 Contact: shaheedalamcontact@gmail.com  

---
### ⭐ If you like this project, consider giving it a star ⭐


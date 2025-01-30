const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

// initializing the app
const app = express();

// global middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://the-hotel-8a122.web.app",
      "https://the-hotel-8a122.firebaseapp.com",
    ],
    credentials: true,
  })
);

// jwt token verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

// cookie credentials
const cookieCredentials = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cu6ru.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );

    // database and collections
    const database = client.db("theHotelDB");
    const roomsCollection = database.collection("rooms");
    const bookingsCollection = database.collection("bookings");

    // rooms apis

    // api to get all the rooms data
    app.get("/rooms", async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();

      res.send(result);
    });

    // api to get the room data using the room id
    app.get("/rooms/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate room ID
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid room ID" });
        }

        // finding room data using roomId
        const result = await roomsCollection.findOne({ _id: new ObjectId(id) });

        // checking if result exists
        if (!result) {
          return res.status(404).send({
            success: false,
            message: "Room not found",
          });
        }

        res.status(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // api to get top rated rooms based on the user ratings
    app.get("/top-rated-rooms", async (req, res) => {
      try {
        const topRooms = await roomsCollection
          .aggregate([
            {
              $addFields: {
                avgRating: {
                  $avg: "$userReviews.client_rating", // Calculate average rating
                },
              },
            },
            { $sort: { avgRating: -1 } }, // Sort by avgRating (Descending)
            { $limit: 6 }, // Limit to 6 rooms
            {
              $project: {
                _id: 1,
                name: 1,
                imageURL: 1,
                userReviews: 1,
                description: 1,
                size: 1,
                bedType: 1,
                totalGuests: 1,
              },
            }, // Select only necessary fields
          ])
          .toArray();

        res.status(200).json({ success: true, data: topRooms });
      } catch (error) {
        console.error("Error fetching top-rated rooms:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    // booking apis

    // api to make a booking
    app.post("/booking", verifyToken, async (req, res) => {
      const session = client.startSession(); // Start a session for transaction

      try {
        session.startTransaction(); // Begin transaction

        const { roomId, bookingDate, ...bookingInfo } = req.body; // Destructure request data

        // Validate room ID
        if (!ObjectId.isValid(roomId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid room ID" });
        }

        // Validate booking date
        if (!bookingDate) {
          return res
            .status(400)
            .json({ success: false, message: "Booking date is required" });
        }

        // Check if the room exists and prevent duplicate booking dates
        const room = await roomsCollection.findOne({
          _id: new ObjectId(roomId),
        });

        if (!room) {
          return res
            .status(404)
            .json({ success: false, message: "Room not found" });
        }

        if (room.bookings.includes(bookingDate)) {
          return res
            .status(409)
            .json({ success: false, message: "Booking date already taken" });
        }

        // Insert booking into the bookings collection
        const bookingInsertResult = await bookingsCollection.insertOne(
          { roomId, bookingDate, ...bookingInfo },
          { session }
        );

        // Update the room's bookings array
        const roomUpdateResult = await roomsCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $push: { bookings: bookingDate } },
          { session }
        );

        // Ensure both operations were successful
        if (
          !bookingInsertResult.insertedId ||
          roomUpdateResult.modifiedCount === 0
        ) {
          await session.abortTransaction();
          return res
            .status(500)
            .json({ success: false, message: "Booking failed" });
        }

        await session.commitTransaction(); // Commit transaction
        res.status(201).json({ success: true, message: "Booking successful" });
      } catch (error) {
        await session.abortTransaction(); // Rollback transaction on error
        console.error("Error booking room:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      } finally {
        session.endSession(); // End transaction session
      }
    });

    // api to get all the bookings data specific to the user
    app.get("/my-bookings", verifyToken, async (req, res) => {
      try {
        const userEmail = req.query.email;
        const decodedEmail = req.decoded.email;

        // Authorization check
        if (userEmail !== decodedEmail) {
          return res
            .status(403)
            .json({ success: false, message: "Forbidden access" });
        }

        // Fetch bookings for the user
        const bookingData = await bookingsCollection
          .find({ client_email: userEmail })
          .sort({ _id: -1 }) // Sort by _id in descending order
          .toArray();

        // Extract unique roomIds from bookings
        const roomIds = bookingData.map(
          (booking) => new ObjectId(booking.roomId)
        );

        // Fetch all bookings data for the relevant roomIds in a single query
        const roomData = await roomsCollection
          .find({ _id: { $in: roomIds } }, { projection: { bookings: 1 } })
          .toArray();

        // Map room data by roomId for easy access
        const roomMap = roomData.reduce((acc, room) => {
          acc[room._id.toString()] = room.bookings || [];
          return acc;
        }, {});

        // Merge room bookings data with user bookings
        const result = bookingData.map((booking) => ({
          ...booking,
          bookings: roomMap[booking.roomId] || [], // Attach bookings array from room data
        }));

        res.status(200).json({ success: true, data: result });
      } catch (error) {
        console.error("Error fetching user bookings:", error);
        res.status(500).json({
          success: false,
          message: "An internal server error occurred. Please try again later.",
        });
      }
    });

    // api to cancel a booking for specific user
    app.delete("/cancel-booking", verifyToken, async (req, res) => {
      try {
        const userEmail = req.query.email;
        const bookingId = req.query.bookingId;
        const roomId = req.query.roomId;
        const bookingDate = req.query.date;
        const decodedEmail = req.decoded.email;

        // Authorization check
        if (userEmail !== decodedEmail) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden access" });
        }

        // Validate ObjectIds
        if (!ObjectId.isValid(bookingId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid booking ID" });
        }

        if (!ObjectId.isValid(roomId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid room ID" });
        }

        // Remove the booking date from the room's bookings array
        const roomResult = await roomsCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $pull: { bookings: bookingDate } }
        );

        // Delete the booking document
        const bookingResult = await bookingsCollection.deleteOne({
          _id: new ObjectId(bookingId),
        });

        // Check MongoDB operation results
        if (roomResult.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message:
              "Failed to update room bookings. Booking date not found or already removed.",
          });
        }

        if (bookingResult.deletedCount !== 1) {
          return res.status(400).send({
            success: false,
            message: "Failed to delete booking. Booking ID not found.",
          });
        }

        // Success response
        return res.send({
          success: true,
          message: "Booking canceled successfully!",
        });
      } catch (error) {
        console.error("Error canceling booking:", error);
        res.status(500).send({
          success: false,
          message:
            "An error occurred while canceling the booking. Please try again later.",
        });
      }
    });

    // api to update the booking data for specific user
    app.patch("/update-booking", verifyToken, async (req, res) => {
      try {
        const {
          roomId,
          bookingId,
          userEmail,
          currentBookingDate,
          newBookingDate,
        } = req.body;
        const decodedEmail = req.decoded.email;

        // Authorization Check
        if (userEmail !== decodedEmail) {
          return res
            .status(403)
            .json({ success: false, message: "Forbidden access" });
        }

        // Validate ObjectId
        if (!ObjectId.isValid(bookingId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid booking ID" });
        }

        if (!ObjectId.isValid(roomId)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid room ID" });
        }

        // Validate Booking Dates
        if (!currentBookingDate || !newBookingDate) {
          return res
            .status(400)
            .json({ success: false, message: "Booking dates are required" });
        }

        // Update Room Bookings Array
        const roomResult = await roomsCollection.updateOne(
          { _id: new ObjectId(roomId), bookings: currentBookingDate },
          { $set: { "bookings.$": newBookingDate } }
        );

        if (roomResult.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message:
              "Failed to update room bookings. Current booking date not found.",
          });
        }

        // Update Booking Document
        const bookingResult = await bookingsCollection.updateOne(
          { _id: new ObjectId(bookingId) },
          { $set: { bookingDate: newBookingDate } }
        );

        if (bookingResult.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Failed to update booking. Booking ID not found.",
          });
        }

        // Success Response
        res.status(200).json({
          success: true,
          message: "Booking date updated successfully",
        });
      } catch (error) {
        console.error("Error updating booking:", error); // Log error for debugging
        res.status(500).json({
          success: false,
          message: "An internal server error occurred. Please try again later.",
        });
      }
    });

    // api to post a review after booking
    app.post("/review", verifyToken, async (req, res) => {
      try {
        const roomId = req.query.id;
        const userEmail = req.query.email;
        const decodedEmail = req.decoded.email;
        const reviewInfo = req.body;

        // Authorization check
        if (userEmail !== decodedEmail) {
          return res
            .status(403)
            .send({ success: false, message: "Forbidden access" });
        }

        // validating room id
        if (!ObjectId.isValid(roomId)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid room ID" });
        }

        // inserting the review to the room collection
        const result = await roomsCollection.updateOne(
          { _id: new ObjectId(roomId) },
          { $push: { userReviews: reviewInfo } }
        );

        // Check MongoDB operation results
        if (result.modifiedCount === 0) {
          return res.status(400).send({
            success: false,
            message: "Failed to post review. Please try again later!",
          });
        }

        // Success response
        return res.send({
          success: true,
          message: "Review posted successfully!",
        });
      } catch (error) {
        console.error("Error posting review:", error);
        res.status(500).send({
          success: false,
          message:
            "An error occurred while posting the review. Please try again later.",
        });
      }
    });

    // jwt apis
    app.post("/get-token", (req, res) => {
      const payload = req.body;
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      res
        .cookie("token", token, cookieCredentials)
        .send({ success: true, message: "Token sent to client" });
    });

    app.get("/remove-token", (req, res) => {
      res
        .clearCookie("token", cookieCredentials)
        .send({ success: true, message: "Token removed" });
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("the hotel server!!!");
});

app.listen(port, () => {
  console.log("the hotel server is running on port: ", port);
});

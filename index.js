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
app.use(cors());

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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // database and collections
    const database = client.db("theHotelDB");
    const roomsCollection = database.collection("rooms");
    const bookingsCollection = database.collection("bookings");

    // rooms apis
    app.get("/rooms", async (req, res) => {
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/rooms/:id", async (req, res) => {
      try {
        const id = req.params.id;

        // Validate room ID
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid room ID" });
        }

        const query = { _id: new ObjectId(id) };
        const result = await roomsCollection.findOne(query);

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

    // booking apis
    app.post("/booking", async (req, res) => {
      try {
        const bookingInfo = req.body;
        
        // Validate room ID
        if (!ObjectId.isValid(bookingInfo.roomId)) {
          return res
            .status(400)
            .send({ success: false, message: "Invalid room ID" });
        }

        // Validate booking date
        if (!bookingInfo.bookingDate) {
          return res
            .status(400)
            .send({ success: false, message: "Booking date is required" });
        }

        // inserting booking details to booking collection
        const insertionResult = await bookingsCollection.insertOne(bookingInfo);

        // Update the document by pushing the new booking date to the `bookings` array
        const updatesResult = await roomsCollection.updateOne(
          { _id: new ObjectId(bookingInfo.roomId) },
          { $push: { bookings: bookingInfo.bookingDate } }
        );

        // Check if the room was found and updated
        if (!(updatesResult.matchedCount && insertionResult.insertedId)) {
          return res
            .status(404)
            .send({ success: false, message: "Room not found" });
        }

        res.status(200).send({ success: true, message: "Booking date added successfully" });

      } catch (error) {
        res.status(500).send({
          success: false,
          message: "Internal server error",
        });
      }
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

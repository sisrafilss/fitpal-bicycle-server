const express = require("express");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(`${process.env.STRIPE_SECRET}`);
const fileUpload = require("express-fileupload");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.quv1r.mongodb.net:27017,cluster0-shard-00-01.quv1r.mongodb.net:27017,cluster0-shard-00-02.quv1r.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-teugro-shard-0&authSource=admin&retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();

    const database = client.db("fitpal_bicycle");
    const productCollection = database.collection("products");
    const reviewCollection = database.collection("reviews");
    const orderCollection = database.collection("orders");
    const userCollection = database.collection("users");

    // POST - Add user data to Database
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.json(result);
    });

    // PUT - Update user data to database for third party login system
    app.put("/users", async (req, res) => {
      const userData = req.body;
      const filter = { email: userData.email };
      const options = { upsert: true };
      const updateDoc = { $set: userData };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    // GET highlighted products
    app.get("/highlighted-products", async (req, res) => {
      const cursor = productCollection.find({});
      const highlightedProducts = await cursor.limit(6).toArray();
      res.json(highlightedProducts);
    });

    // POST - Add a product - Admin
    app.post("/add-product", async (req, res) => {
      // Extract image data and convert it to binary base 64
      const pic = req.files.img;
      const picData = pic.data;
      const encodedPic = picData.toString("base64");
      const imageBuffer = Buffer.from(encodedPic, "base64");

      // Form product object
      const { title, description, price } = req.body;
      const product = {
        title,
        description,
        img: imageBuffer,
        price,
      };

      const result = await productCollection.insertOne(product);
      res.json(result);
    });

    // GET All products
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      const products = await cursor.toArray();
      res.json(products);
    });

    // Delete - Delete a product by admin
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.json(result);
    });

    // GET Single Product Details
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.json(product);
    });

    // GET Reviews
    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find({});
      const reviews = await cursor.toArray();
      res.json(reviews);
    });

    // POST - User Review
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // GET - Admin Status
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      let isAdmin = false;
      if (result?.role === "admin") {
        isAdmin = true;
        res.json({ admin: isAdmin });
      } else {
        res.json({ message: "You are not an Admin." });
      }
    });

    // PUT - Set an user role as admin
    app.put("/make-admin", async (req, res) => {
      const filter = req.body;
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);

      res.json(result);
    });

    // GET - All Orders (for Admin)
    app.get("/all-orders", async (req, res) => {
      const email = req.query.email;
      const cursor = orderCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });

    // PUT - Update an order status
    app.put("/all-orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const found = await orderCollection.findOne(query);
      found.status = "Shipped";
      const filter = query;
      const options = { upsert: false };
      const updateDoc = { $set: found };
      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    // Delete - Delete an Order by admin
    app.delete("/all-orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    // GET - an order info for payment
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);

      res.json(result);
    });

    // PUT - Update order info in orders
    // app.put('/payment/id', async (req, res) => {
    //     id = req.params.id;
    //     console.log('id', id);
    // });

    // POST - place order
    app.post("/place-order", async (req, res) => {
      const order = req.body;
      order["status"] = "Pending";
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });

    // GET - Orders for specific user
    app.get("/my-orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = orderCollection.find(query);
      if ((await cursor.count()) > 0) {
        const orders = await cursor.toArray();
        res.json(orders);
      } else {
        res.json({ message: "Product Not Found!" });
      }
    });

    // Delete - an order by user
    app.delete("/my-orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    // Payment Intent
    app.post("/create-payment-intent", async (req, res) => {
      const paymentInfo = req.body;
      const amount = paymentInfo.price * 100;

      console.log("amount", amount);

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("FitPal Bicycle Server is Running");
});

app.listen(port, () => {
  console.log("Server has started at port:", port);
});

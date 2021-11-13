const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const cors = require('cors');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-shard-00-00.quv1r.mongodb.net:27017,cluster0-shard-00-01.quv1r.mongodb.net:27017,cluster0-shard-00-02.quv1r.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-teugro-shard-0&authSource=admin&retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();

        const database = client.db('fitpal_bicycle');
        const productCollection = database.collection('products');
        const reviewCollection = database.collection('reviews');
        const orderCollection = database.collection('orders');
        const userCollection = database.collection('users');

        // POST - Add user data to Database
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            newUser['role'] = 'user';
            const result = await userCollection.insertOne(newUser);
            console.log(result);
            res.json(result);
        })

        // PUT - Update user data to database for third party login system
        app.put('/users', async (req, res) => {
            const userData = req.body;
            userData['role'] = 'user';
            const filter = { email: userData.email }
            const options = { upsert: true }
            const updateDoc = { $set: userData }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            console.log(result);
            res.json(result);
        })

        // GET highlighted products
        app.get('/highlighted-products', async (req, res) => {
            const cursor = productCollection.find({});
            const highlightedProducts = await cursor.limit(6).toArray();
            res.json(highlightedProducts);
        });

        // GET All products 
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const products = await cursor.toArray();
            res.json(products);
        });

        // GET Single Product Details 
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const product = await productCollection.findOne(query);
            res.json(product);
        });

        // GET Reviews
        app.get('/reviews', async (req, res) => {
            const cursor = reviewCollection.find({});
            const reviews = await cursor.toArray();
            res.json(reviews);
        });

        // POST - User Review
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        // GET - All Orders (for Admin)
        app.get('/all-orders', async (req, res) => {
            const email = req.query.email;

        });

        // POST - place order
        app.post('/place-order', async (req, res) => {
            const order = req.body;
            order['status'] = 'Pending';
            const result = await orderCollection.insertOne(order);
            res.json(result);
        });

        // GET - Orders for specific user
        app.get('/my-orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = orderCollection.find(query);
            if (await cursor.count() > 0) {
                const orders = await cursor.toArray();
                res.json(orders);
            }
            else {
                res.json({ message: 'Product Not Found!' })
            }
        });

        // Delete - an order by user
        app.delete('/my-orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query);
            console.log(result);
            res.json(result);
        })

    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('FitPal Bicycle Server is Running');
})

app.listen(port, () => {
    console.log('Server has started at port:', port);
})
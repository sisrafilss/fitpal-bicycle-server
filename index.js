const express = require('express');
const { MongoClient } = require('mongodb');
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

        // GET Reviews
        app.get('/reviews', async (req, res) => {
            const cursor = reviewCollection.find({});
            const reviews = await cursor.toArray();
            res.json(reviews);
        });
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
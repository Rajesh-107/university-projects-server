const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());



const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s6lco.mongodb.net/?retryWrites=true&w=majority`;
const verify = require('jsonwebtoken/verify');
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run(){
    try{
        await client.connect();
        const categoriesCollection = client.db('eMart').collection('categories');
        const productCollection = client.db('eMart').collection('product');
        const userCollection = client.db('eMart').collection('users');
        // const taskCollection = client.db('dailyTask').collection('tasks');
        // const completedCollection = client.db('dailyTask').collection('completeTask');

        app.get('/categories', async(req, res) => {
            const query = {};
            const cursor = categoriesCollection.find(query);
            const categories = await cursor.toArray();
            res.send(categories);
        })


        app.get('/product', async(req, res) =>{
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            const query ={};
            const cursor = productCollection.find(query);
            let products;
            if(page || size){
                products = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                products = await cursor.toArray();
            }

           
            res.send(products);
        });

        app.get('/user', async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });


        app.get('/admin/:email', async(req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', verifyJWT,  async(req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email: requester})
            if(requesterAccount.role === 'admin'){
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
          else{
            res.status(403).send({message: 'forbidden'});
          }
        })



        app.put('/user/:email', async(req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
            res.send({ result, token });
        })


        app.get('/productcount', async(req, res) =>{
            const query ={};
            const cursor = productCollection.find(query);
            const count = await productCollection.estimatedDocumentCount();
            res.send({count});
        })

        app.post('/productBykeys' , async(req, res) =>{
            const keys = req.body;
            const ids = keys.map(id => ObjectId(id));
            const query = {_id: {$in : ids}}
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            console.log(keys);
            res.send(products);
            
        })

        // //to do list

        // app.post('/addTask', async (req, res) => {
        //     const addTask = req.body;
        //     // console.log(addTask);
        //     const result = await taskCollection.insertOne(addTask);
        //     res.send(result);
        // })

        // app.get('/addTask', async (req, res) => {            
        //     const result = await taskCollection.find({}).toArray();
        //     res.send(result)
        // })

        // app.post('/complete', async (req, res) => {;
        //     const task = req.body;
        //     const result = await completedCollection.insertOne(task);
        //     res.send(result)

        // });

        //  app.delete('/addTask/:id', async (req, res) => {
        //     const id = req.params.id;
        //     // console.log(id)
        //     const query = {_id: ObjectId(id)};
        //     const result = await taskCollection.deleteOne(query);
        //     res.send(result)

        // });

        // app.get('/completedTask', async (req, res)=>{
        //     const result = await completedCollection.find({}).toArray();
        //     res.send(result)
        // })

        // to do list
    }
    finally {
        
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('University server running')
});
app.listen(port, () => {
    console.log('Server is running on port', port)
})
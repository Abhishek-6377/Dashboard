const express = require('express');
const cors = require('cors');
require('./db/config');
const User = require('./db/User');
const Product = require('./db/Product');
const Jwt = require('jsonwebtoken');

const jwtKey = 'e-comm';
const app = express();

app.use(express.json());
app.use(cors());

const port = 5000;

// Register route
app.post("/register", async (req, res) => {
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password;

    Jwt.sign({ result }, jwtKey, { expiresIn: "2h" }, (err, token) => {
        if (err) {
            res.send( {result:"Something went wrong"});
        }
            res.send({ result, auth: token });
    });
});

// Login route
app.post('/login', async (req, res) => {
    if (req.body.password && req.body.email) {
        let user = await User.findOne(req.body).select("-password");
        if (user) {
            Jwt.sign({ user }, jwtKey, { expiresIn: "2h" }, (err, token) => {
                if (err) {
                    res.send({ result: "Something went wrong" });
                }
                    res.send({ user, auth: token });
            });
        } else {
            res.send({ result: "No user found" });
        }
    } else {
        res.send({ result: "No user found" });
    }
});

// Add product
app.post('/add-product',verifyToken, async (req, res) => {
    let product = new Product(req.body);
    let result = await product.save();
    res.send(result);
});

// Get all products
app.get("/products", verifyToken, async (req, res) => {
    const products = await Product.find();
    if (products.length > 0) {
        res.send(products);
    } else {
        res.send({ result: "No products found" });
    }
});

// Delete a product
app.delete("/product/:id", verifyToken, async (req, res) => {
    let result = await Product.deleteOne({ _id:req.params.id });
    res.send(result);
});

// Get single product
app.get("/product/:id", verifyToken, async (req, res) => {
    let result = await Product.findOne({ _id: req.params.id });
    if (result) {
        res.send(result);
    } else {
        res.send({ result: "No record found" });
    }
});

// Update product
app.put("/product/:id", verifyToken, async (req, res) => {
    let result = await Product.updateOne(
        { _id: req.params.id },
        {
            $set: req.body
        }
    );
    res.send(result);
});

app.put("/product/:id", verifyToken, async (req, res) => {
    let result = await Product.updateOne(
        { _id: req.params.id },
        {
            $set: req.body
        }
    );
    res.send(result);
});

// Search product by keyword
app.get("/search/:key", verifyToken, async (req, res) => {
    let result = await Product.find({
        "$or": [
            { name: { $regex: req.params.key} },
            { company: { $regex: req.params.key } },
            { category: { $regex: req.params.key } }
        ]
    });
    res.send(result);
});

app.put('/api/user/:id',verifyToken, async (req,res)=>{
    const {name, email} = req.body;
try{
    const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        {name, email},
        {new:true}
    );
   if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//middleware
function verifyToken(req, res, next){
    let token = req.headers['authorization'];
    if(token){
        token = token.split(' ')[1];
            console.warn("middleware called if",token);
            Jwt.verify(token, jwtKey, (err, valid)=>{
                if(err){
                    res.send({result:"Please provide valid token"});
                }else{
                    next()
                }
            })
    }
    else{
        res.status(403).send({result:"Please add token with headers"});
    }
    // console.warn("middleware called",token);
}

// Start server
app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});

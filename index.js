const express = require('express');
const cors = require('cors');
require('./db/config'); // Make sure this connects to your MongoDB properly
const User = require('./models/User');
const Product = require('./models/Product');
const Jwt = require('jsonwebtoken');

const jwtKey = 'e-comm'; // In production, use environment variables for secrets
const app = express();
const port = 5000;

app.use(
  cors({
    origin: ['http://localhost:3000', 'https://astonishing-vacherin-077478.netlify.app'],
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// Middleware to verify JWT token in Authorization header
function verifyToken(req, res, next) {
  let token = req.headers['authorization'];

  if (token) {
    // Expected format: "Bearer <token>"
    token = token.split(' ')[1];
    Jwt.verify(token, jwtKey, (err, valid) => {
      if (err) {
        return res.status(401).send({ result: 'Please provide a valid token' });
      } else {
        // Optionally attach the decoded token info to req object
        req.user = valid;
        next();
      }
    });
  } else {
    return res.status(403).send({ result: 'Please add token with headers' });
  }
}

// Register route
app.post('/register', async (req, res) => {
  try {
    // Validate request body fields
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).send({ error: 'Name, email and password are required' });
    }

    // Create new user
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password; // remove password before sending back

    // Generate JWT token
    Jwt.sign({ user: result }, jwtKey, { expiresIn: '2h' }, (err, token) => {
      if (err) {
        console.error('JWT sign error:', err);
        return res.status(500).send({ error: 'Something went wrong during token generation' });
      }
      res.status(201).send({ user: result, auth: token });
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      // Duplicate key error (e.g., email already exists)
      return res.status(400).send({ error: 'User with this email already exists' });
    }
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({ result: 'Email and password required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send({ result: 'No user found with this email' });
    }

    // TODO: Implement password hashing and verification!
    // Example with bcrypt:
    // const match = await bcrypt.compare(password, user.password);
    // if (!match) return res.status(401).send({ result: "Invalid credentials" });

    if (user.password !== password) {
      return res.status(401).send({ result: 'Invalid password' });
    }

    const userObj = user.toObject();
    delete userObj.password; // remove password before sending back

    Jwt.sign({ user: userObj }, jwtKey, { expiresIn: '2h' }, (err, token) => {
      if (err) {
        return res.status(500).send({ result: 'Something went wrong during token generation' });
      }
      res.send({ user: userObj, auth: token });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send({ result: 'Internal server error' });
  }
});

// Add product route (protected)
app.post('/add-product', verifyToken, async (req, res) => {
  try {
    let product = new Product(req.body);
    let result = await product.save();
    res.status(201).send(result);
  } catch (err) {
    console.error('Add product error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Get all products (protected)
app.get('/products', verifyToken, async (req, res) => {
  try {
    const products = await Product.find();
    if (products.length > 0) {
      res.send(products);
    } else {
      res.send({ result: 'No products found' });
    }
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Delete a product (protected)
app.delete('/product/:id', verifyToken, async (req, res) => {
  try {
    let result = await Product.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).send({ result: 'Product not found' });
    }
    res.send(result);
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Get single product (protected)
app.get('/product/:id', verifyToken, async (req, res) => {
  try {
    let result = await Product.findById(req.params.id);
    if (result) {
      res.send(result);
    } else {
      res.status(404).send({ result: 'No record found' });
    }
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Update product (protected)
app.put('/product/:id', verifyToken, async (req, res) => {
  try {
    let result = await Product.updateOne(
      { _id: req.params.id },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ result: 'Product not found' });
    }

    res.send(result);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Search product by keyword (protected)
app.get('/search/:key', verifyToken, async (req, res) => {
  try {
    let result = await Product.find({
      $or: [
        { name: { $regex: req.params.key, $options: 'i' } }, // case-insensitive
        { company: { $regex: req.params.key, $options: 'i' } },
        { category: { $regex: req.params.key, $options: 'i' } }
      ],
    });
    res.send(result);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Update user info (protected)
app.put('/api/user/:id', verifyToken, async (req, res) => {
  const { name, email } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userObj = updatedUser.toObject();
    delete userObj.password;

    res.json(userObj);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});

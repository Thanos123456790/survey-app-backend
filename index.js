// Existing imports and setup
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URL;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("surveyApp");
        const surveyCollection = db.collection("surveys");
        const responsesCollection = db.collection("responses");
        const userCollection = db.collection("users");
        const feedbackCollection = db.collection("feedbacks");

        // 🚀 Create Survey API
        app.post("/api/surveys", async (req, res) => {
            try {
                const survey = req.body;
                const result = await surveyCollection.insertOne(survey);
                res.status(201).json({ message: "Survey created!", id: result.insertedId });
            } catch (error) {
                console.error("Error creating survey:", error);
                res.status(500).json({ error: "Failed to create survey" });
            }
        });

        app.post("/api/survey-responses", async (req, res) => {
            try {
                const { surveyId, answers } = req.body;
                const result = await responsesCollection.insertOne({ surveyId, answers, submittedAt: new Date() });
                res.status(201).json({ message: "Survey response submitted!", id: result.insertedId });
            } catch (error) {
                console.error("Error submitting survey response:", error);
                res.status(500).json({ error: "Failed to submit response" });
            }
        });

        // 🚀 Fetch All Surveys API
        app.get("/api/surveys", async (req, res) => {
            try {
                const surveys = await surveyCollection.find().toArray();
                res.status(200).json(surveys);
            } catch (error) {
                console.error("Error fetching surveys:", error);
                res.status(500).json({ error: "Failed to fetch surveys" });
            }
        });

        // 🚀 Fetch Survey By ID API
        app.get("/api/surveys/:id", async (req, res) => {
            try {
                const surveyId = req.params.id;
                const survey = await surveyCollection.findOne({ _id: new ObjectId(surveyId) });

                if (!survey) {
                    return res.status(404).json({ error: "Survey not found" });
                }

                res.status(200).json(survey);
            } catch (error) {
                console.error("Error fetching survey by ID:", error);
                res.status(500).json({ error: "Failed to fetch survey by ID" });
            }
        });


        app.get("/api/survey-responses/:surveyId", async (req, res) => {
            const { surveyId } = req.params;
            try {
                const responses = await responsesCollection.find({ surveyId }).toArray();
                res.status(200).json(responses);
            } catch (error) {
                console.error("Error fetching survey responses:", error);
                res.status(500).json({ error: "Failed to fetch survey responses" });
            }
        });

        app.get("/api/survey-responses/response/:id", async (req, res) => {
            const { id } = req.params;
            try {
                const response = await responsesCollection.findOne({ _id: new ObjectId(id) });
                if (response) {
                    res.status(200).json(response);
                } else {
                    res.status(404).json({ error: "Survey response not found" });
                }
            } catch (error) {
                console.error("Error fetching survey response:", error);
                res.status(500).json({ error: "Failed to fetch survey response" });
            }
        });

        // 🚀 Update Survey API
        app.put("/api/surveys/:id", async (req, res) => {
            try {
                const surveyId = req.params.id;
                const updatedSurvey = req.body;
                const result = await surveyCollection.updateOne(
                    { _id: new ObjectId(surveyId) },
                    { $set: updatedSurvey }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: "Survey not found" });
                }

                res.status(200).json({ message: "Survey updated successfully!" });
            } catch (error) {
                console.error("Error updating survey:", error);
                res.status(500).json({ error: "Failed to update survey" });
            }
        });

        app.get('/api/users', async (req, res) => {
            const email = req.query.email;
            const response = await userCollection.findOne({ email });
            if (response) {
                res.status(200).json({ data: response, exists: true });
            } else {
                res.json({ exists: false });
            }
        });

        app.post('/api/users/login', async (req, res) => {
            try {
                const { email, password } = req.body;
        
                // Find user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }
        
                // Compare hashed password
                if(user.password !== password){
                    const isPasswordValid = await bcrypt.compare(password, user.password);
                    if (!isPasswordValid) {
                        return res.status(401).json({ success: false, message: 'Invalid credentials' });
                    }
                }else{
                    return res.status(401).json({ success: false, message: 'Invalid credentials' });
                }
                res.json({ success: true, user });
            } catch (error) {
                console.error("Error logging in:", error);
                res.status(500).json({ success: false, message: "Failed to log in." });
            }
        });
        

        // 🚀 Create User API
        app.post('/api/users/create', async (req, res) => {
            try {
                const { name, email, password, profileImg, god_access } = req.body;

                // Validation
                if (!name || !email || !password || !profileImg) {
                    return res.status(400).json({ success: false, message: "All fields (name, email, password, profileImg) are required." });
                }

                // Check if user already exists
                const existingUser = await userCollection.findOne({ email });

                if (existingUser) {
                    return res.status(400).json({ success: false, message: "User with this email already exists." });
                }

                // Create new user object
                const newUser = {
                    name,
                    email,
                    password,
                    profileImg,
                    god_access: god_access || false // default to false if not provided
                };

                // Insert user into DB
                const result = await userCollection.insertOne(newUser);

                res.status(201).json({ success: true, message: "User created successfully!", userId: result.insertedId });
            } catch (error) {
                console.error("Error creating user:", error);
                res.status(500).json({ success: false, message: "Failed to create user." });
            }
        });

        // 🚀 User Registration API
        app.post('/api/users/register', async (req, res) => {
            try {
                const { name, email, password, profileImg, god_access } = req.body;

                // Validation
                if (!name || !email || !password) {
                    return res.status(400).json({ success: false, message: "All fields (name, email, password) are required." });
                }

                // Check if user already exists
                const existingUser = await userCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "User with this email already exists." });
                }

                // Hashing password for security
                const hashedPassword = await bcrypt.hash(password, 10);

                // Create new user object
                const newUser = {
                    name,
                    email,
                    password: hashedPassword,
                    profileImg: profileImg || null,
                    god_access: god_access || false
                };

                // Insert user into DB
                const result = await userCollection.insertOne(newUser);

                res.status(201).json({ success: true, message: "User registered successfully!", userId: result.insertedId });
            } catch (error) {
                console.error("Error registering user:", error);
                res.status(500).json({ success: false, message: "Failed to register user." });
            }
        });

        // 🚀 Provider Login API
        app.post('/api/providers/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                // Check if provider exists
                const provider = await userCollection.findOne({ email });
                if (!provider) {
                    return res.status(401).json({ success: false, message: "Provider not found." });
                }

                // Validate password
                const isValidPassword = await bcrypt.compare(password, provider.password);
                if (!isValidPassword) {
                    return res.status(401).json({ success: false, message: "Invalid credentials." });
                }

                res.status(200).json({ success: true, message: "Provider login successful!", provider });
            } catch (error) {
                console.error("Error in provider login:", error);
                res.status(500).json({ success: false, message: "Failed to log in provider." });
            }
        });

        app.post("/api/feedback", async (req, res) => {
            try {
                const { username, email, rating, topic, technical_issue, profileImg } = req.body;

                // Validation
                if (!username || !email || !rating || !topic) {
                    return res.status(400).json({ success: false, message: "Missing required fields (username, email, rating, topic)." });
                }

                const newFeedback = {
                    username,
                    email,
                    rating,
                    topic,
                    technical_issue: technical_issue || false,
                    profileImg: profileImg || null,
                    submittedAt: new Date(),
                };

                const result = await feedbackCollection.insertOne(newFeedback);
                res.status(201).json({ success: true, message: "Feedback submitted successfully!", feedbackId: result.insertedId });
            } catch (error) {
                console.error("Error submitting feedback:", error);
                res.status(500).json({ success: false, message: "Failed to submit feedback." });
            }
        });

        app.get("/api/feedback", async (req, res) => {
            try {
                const feedbacks = await feedbackCollection.find().toArray();
                res.status(200).json({ success: true, feedbacks });
            } catch (error) {
                console.error("Error fetching feedbacks:", error);
                res.status(500).json({ success: false, message: "Failed to fetch feedbacks." });
            }
        });




    } catch (error) {
        console.error(error);
    }
}

run();

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

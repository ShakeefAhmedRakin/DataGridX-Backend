const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iixzvov.mongodb.net/?retryWrites=true&w=majority`;

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
    // LOADING COLLECTIONS
    const usersCollection = client
      .db("DataGridX")
      .collection("usersCollection");
    const tablesCollection = client
      .db("DataGridX")
      .collection("tablesCollection");

    // TOKEN AUTH API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // MIDDLEWARE
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // VERIFY ADMIN MIDDLEWARE
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // ++USER POST API++
    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });

    // ++USER SINGLE GET API++
    app.get("/users/data/isAdmin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized" });
      }
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send({ isAdmin: result.role === "admin" ? true : false });
    });

    // TABLE CREATION API
    app.post("/users/tables", verifyToken, async (req, res) => {
      try {
        const newTable = req.body;
        const result = await tablesCollection.insertOne({
          ...newTable,
          data: [
            [{ cellValue: "HEADING" }, { cellValue: "HEADING" }],
            [{ cellValue: "" }, { cellValue: "" }],
          ], // Initialize with an 2x2 table matrix
        });

        res.status(201).send({ _id: result.insertedId, ...newTable, data: [] });
      } catch (error) {
        console.error("Error creating table:", error);
        res.status(500).send("Failed to create table");
      }
    });

    // ++USER TABLE GET API++
    app.get("/users/:email/tables", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized" });
      }

      const query = { email: email };
      const tables = await tablesCollection.find(query).toArray();
      res.send(tables);
    });

    // ++USER SINGLE TABLE GET API++
    app.get("/users/:email/tables/:id", verifyToken, async (req, res) => {
      const email = req.params.email;
      const id = req.params.id;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized" });
      }

      try {
        const query = { email: email, _id: new ObjectId(id) };
        const table = await tablesCollection.findOne(query);

        if (!table) {
          return res.status(404).send({ message: "Table not found" });
        }

        res.send(table);
      } catch (error) {
        console.error("Error fetching table:", error);
        res.status(500).send("Failed to fetch table");
      }
    });

    // ADD ROW API
    app.post(
      "/users/:email/tables/:id/addRow",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const id = req.params.id;

        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }

        try {
          const query = { email: email, _id: new ObjectId(id) };
          const table = await tablesCollection.findOne(query);

          if (!table) {
            return res.status(404).send({ message: "Table not found" });
          }

          const newRow = table.data[0].map(() => ({ cellValue: "" }));
          table.data.push(newRow);

          const updateResult = await tablesCollection.updateOne(query, {
            $set: { data: table.data },
          });

          res.send(updateResult);
        } catch (error) {
          console.error("Error adding row:", error);
          res.status(500).send("Failed to add row");
        }
      }
    );

    // ADD COLUMN API
    app.post(
      "/users/:email/tables/:id/addColumn",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const id = req.params.id;

        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }

        try {
          const query = { email: email, _id: new ObjectId(id) };
          const table = await tablesCollection.findOne(query);

          if (!table) {
            return res.status(404).send({ message: "Table not found" });
          }

          table.data.forEach((row) => row.push({ cellValue: "" }));

          const updateResult = await tablesCollection.updateOne(query, {
            $set: { data: table.data },
          });

          res.send(updateResult);
        } catch (error) {
          console.error("Error adding column:", error);
          res.status(500).send("Failed to add column");
        }
      }
    );

    // DELETE ROW API
    app.delete(
      "/users/:email/tables/:id/deleteRow/:rowIndex",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const id = req.params.id;
        const rowIndex = parseInt(req.params.rowIndex);

        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }

        try {
          const query = { email: email, _id: new ObjectId(id) };
          const table = await tablesCollection.findOne(query);

          if (!table) {
            return res.status(404).send({ message: "Table not found" });
          }

          if (rowIndex < 0 || rowIndex >= table.data.length) {
            return res.status(400).send({ message: "Invalid row index" });
          }

          if (table.data.length <= 2) {
            return res
              .status(400)
              .send({ message: "Cannot have less than 2 rows" });
          }

          table.data.splice(rowIndex, 1);

          const updateResult = await tablesCollection.updateOne(query, {
            $set: { data: table.data },
          });

          res.send(updateResult);
        } catch (error) {
          console.error("Error deleting row:", error);
          res.status(500).send("Failed to delete row");
        }
      }
    );

    // DELETE COLUMN API

    app.delete(
      "/users/:email/tables/:id/deleteColumn/:colIndex",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const id = req.params.id;
        const colIndex = parseInt(req.params.colIndex);

        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }

        try {
          const query = { email: email, _id: new ObjectId(id) };
          const table = await tablesCollection.findOne(query);

          if (!table) {
            return res.status(404).send({ message: "Table not found" });
          }

          if (colIndex < 0 || colIndex >= table.data[0].length) {
            return res.status(400).send({ message: "Invalid column index" });
          }

          if (table.data[0].length <= 1) {
            return res
              .status(400)
              .send({ message: "Cannot have less than 1 column" });
          }

          table.data.forEach((row) => row.splice(colIndex, 1));

          const updateResult = await tablesCollection.updateOne(query, {
            $set: { data: table.data },
          });

          res.send(updateResult);
        } catch (error) {
          console.error("Error deleting column:", error);
          res.status(500).send("Failed to delete column");
        }
      }
    );

    // EDIT CELL API
    app.put(
      "/users/:email/tables/:id/editCell",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const id = req.params.id;
        const { rowIndex, colIndex, newValue } = req.body;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized" });
        }

        try {
          const query = { email: email, _id: new ObjectId(id) };
          const table = await tablesCollection.findOne(query);

          if (!table) {
            return res.status(404).send({ message: "Table not found" });
          }

          if (
            rowIndex < 0 ||
            rowIndex >= table.data.length ||
            colIndex < 0 ||
            colIndex >= table.data[0].length
          ) {
            return res.status(400).send({ message: "Invalid cell index" });
          }

          table.data[rowIndex][colIndex].cellValue = newValue;

          const updateResult = await tablesCollection.updateOne(query, {
            $set: { data: table.data },
          });

          res.send(updateResult);
        } catch (error) {
          console.error("Error editing cell:", error);
          res.status(500).send("Failed to edit cell");
        }
      }
    );

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log("Server listening on port", port);
});

const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require("knex");

require("dotenv").config();
const {
  DATABASE_HOST,
  INTERNAL_DATABASE_URL,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
  CLARIFAI_PAT,
  CLARIFAI_MVI,
  PORT,
} = process.env;

const db = knex({
  client: "pg",
  connection: {
    hostname: DATABASE_HOST,
    port: 5432,
    database: DATABASE_NAME,
    username: DATABASE_USER,
    password: DATABASE_PASSWORD,
    connectionString: INTERNAL_DATABASE_URL,
  },
});

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.post("/signin", (req, res) => {
  db("users")
    .where({ email: req.body.email })
    .select("id", "first_name", "hashed_pw", "entries")
    .then((data) => {
      const isPasswordValid = bcrypt.compareSync(
        req.body.password,
        data[0].hashed_pw
      );
      if (isPasswordValid) {
        res.json({
          id: data[0].id,
          first_name: data[0].first_name,
          entries: data[0].entries,
        });
      } else {
        res.json({ id: null, first_name: null, entries: null });
      }
    })
    .catch((error) => {
      res.json({ id: null, first_name: null, entries: null });
    });
});

app.post("/register", (req, res) => {
  const hashedPassword = bcrypt.hashSync(req.body.password);

  db("users")
    .insert(
      {
        first_name: req.body.first_name,
        surname: req.body.surname,
        email: req.body.email,
        hashed_pw: hashedPassword,
        joined: new Date(),
      },
      ["id", "first_name", "entries"]
    )
    .then((data) => {
      res.json({
        id: data[0].id,
        first_name: data[0].first_name,
        entries: data[0].entries,
      });
    })
    .catch((error) => {
      res.json({ id: null, first_name: null, entries: null });
    });
});

app.put("/loggedin", (req, res) => {
  const picture_url = req.body.picture_url;

  const contactClarifai = (input) => {
    const PAT = CLARIFAI_PAT;
    const USER_ID = "clarifai";
    const APP_ID = "main";
    const MODEL_ID = "general-image-detection";
    const MODEL_VERSION_ID = CLARIFAI_MVI;
    const IMAGE_URL = input;

    const raw = JSON.stringify({
      user_app_id: {
        user_id: USER_ID,
        app_id: APP_ID,
      },
      inputs: [
        {
          data: {
            image: {
              url: IMAGE_URL,
            },
          },
        },
      ],
    });

    const requestOptions = {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Key " + PAT,
      },
      body: raw,
    };

    fetch(
      "https://api.clarifai.com/v2/models/" +
        MODEL_ID +
        "/versions/" +
        MODEL_VERSION_ID +
        "/outputs",
      requestOptions
    )
      .then((response) => response.json())
      .then((result) => {
        if (result.status.code === 10000) {
          const regions = result.outputs[0].data.regions;
          let boundingBoxesData = [];
          regions.forEach((region) => {
            // Accessing and rounding the bounding box values
            const boundingBox = region.region_info.bounding_box;
            const boxData = {};
            boxData["topRow"] = boundingBox.top_row.toFixed(3);
            boxData["leftCol"] = boundingBox.left_col.toFixed(3);
            boxData["bottomRow"] = boundingBox.bottom_row.toFixed(3);
            boxData["rightCol"] = boundingBox.right_col.toFixed(3);

            region.data.concepts.forEach((concept) => {
              // Accessing and rounding the concept value
              boxData["name"] = concept.name;
              boxData["probability"] = concept.value.toFixed(3);
            });
            boundingBoxesData.push(boxData);
          });
          db("users")
            .where("id", "=", req.body.id)
            .increment("entries", 1)
            .returning("entries")
            .then((data) => {
              res.json({
                id: req.body.id,
                entries: data[0].entries,
                picture_url: picture_url,
                boundingBoxesData: boundingBoxesData,
              });
            });
        } else {
          res.json({ id: req.body.id, entries: null, picture_url: null });
        }
      })
      .catch((error) =>
        res.json({ id: req.body.id, entries: null, picture_url: null })
      );
  };

  contactClarifai(picture_url);
});

app.listen(PORT || 5000, () => {
  console.log(`The server is running on port ${PORT}.`);
});

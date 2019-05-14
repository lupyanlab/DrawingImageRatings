// Dependencies
const express = require("express");
const path = require("path");
const PythonShell = require("python-shell");
const fs = require("fs");
const csvWriter = require("csv-write-stream");
const _ = require("lodash");
const bodyParser = require("body-parser");
const csv = require("csvtojson");

let app = express();
let writer = csvWriter({ sendHeaders: false });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set("port", process.env.PORT || 7111);

// Add headers
app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
  res.setHeader("Expires", "0"); // Proxies.
  next();
});

// For Rendering HTML
app.get("/", function(req, res) {
  res.sendFile(path.join(__dirname + "/dev/index.html"));
});
app.use(express.static(__dirname + "/dev"));
app.use("/stimuli", express.static(__dirname + "/stimuli"));

app.listen(app.get("port"), function() {
  console.log("Node app is running at http://localhost:" + app.get("port"));
});

let images = { dev: {}, prod: {} };
let categoriesCount = { dev: {}, prod: {} };

// create a new file to store category counts
const categoriesCountDevPath = "categoriesCount.dev.csv";
const categoriesCountProdPath = "categoriesCount.prod.csv";

if (!fs.existsSync(path.join("./demographics"))) {
  fs.mkdirSync(path.join("./demographics"));
}

if (!fs.existsSync(path.join("./trials"))) {
  fs.mkdirSync(path.join("./trials"));
}

if (!fs.existsSync(path.join("./data"))) {
  fs.mkdirSync(path.join("./data"));
}

const categoryNamesMap = {};

csv()
  .fromFile(path.join("category_names.csv"))
  .on("json", jsonObj => {
    const { directory, name } = jsonObj;
    categoryNamesMap[directory] = name;
  })
  .on("done", error => {
    if (error) throw error;
  });

if (fs.existsSync(categoriesCountDevPath)) {
  // Read existing category counts if csv exists.
  csv()
    .fromFile(categoriesCountDevPath)
    .on("json", jsonObj => {
      categoriesCount.dev = jsonObj;
    })
    .on("done", error => {
      if (error) throw error;
      console.log(categoriesCount.dev);
      Object.keys(categoriesCount.dev).forEach(category => {
        const folderLocation = `stimuli/${category}`;
        images.dev[category] = [];
        fs.readdirSync(folderLocation).forEach(file => {
          images.dev[category].push(path.join("stimuli", category, file));
        });
      });
      writer = csvWriter({ sendHeaders: false });
      writer.pipe(fs.createWriteStream(categoriesCountDevPath, { flags: "a" }));
      writer.end();
    });
} else {
  // Create new csv of category counts if doesn't exist.
  // Get all categories from image folders.
  fs.readdirSync("stimuli").forEach(folder => {
    if (folder != ".DS_Store") {
      // Check for image folders that are non-empty
      if (fs.readdirSync("stimuli/" + folder).length > 0) {
        categoriesCount.dev[folder] = 0;
        images.dev[folder] = [];
        fs.readdirSync("stimuli/" + folder).forEach(file => {
          if (file == "TestItems") {
            fs.readdirSync("stimuli/" + folder + "/TestItems").forEach(file => {
              if (
                ![
                  ".DS_Store",
                  "Thumbs.db",
                  "extra",
                  "AMC5143AAS_COB_370.jpe"
                ].includes(file)
              )
                images.dev[folder].push(
                  "stimuli/" + folder + "/TestItems/" + file
                );
            });
          }
          if (
            ![
              ".DS_Store",
              "TestItems",
              "Thumbs.db",
              "extra",
              "AMC5143AAS_COB_370.jpe"
            ].includes(file)
          )
            images.dev[folder].push("stimuli/" + folder + "/" + file);
        });
      }
    }
  });
  writer = csvWriter({ headers: Object.keys(categoriesCount.dev) });
  writer.pipe(fs.createWriteStream(categoriesCountDevPath, { flags: "a" }));
  writer.write(categoriesCount.dev);
  writer.end();
}

if (fs.existsSync(categoriesCountProdPath)) {
  // Read existing category counts if csv exists.
  csv()
    .fromFile(categoriesCountProdPath)
    .on("json", jsonObj => {
      categoriesCount.prod = jsonObj;
    })
    .on("done", error => {
      if (error) throw error;
      console.log(categoriesCount.prod);
      Object.keys(categoriesCount.prod).forEach(category => {
        const folderLocation = `stimuli/${category}`;
        images.prod[category] = [];
        fs.readdirSync(folderLocation).forEach(file => {
          images.prod[category].push(path.join("stimuli", category, file));
        });
      });
      writer = csvWriter({ sendHeaders: false });
      writer.pipe(
        fs.createWriteStream(categoriesCountProdPath, { flags: "a" })
      );
      writer.end();
    });
} else {
  // Create new csv of category counts if doesn't exist.
  // Get all categories from image folders.
  fs.readdirSync("stimuli").forEach(folder => {
    if (folder != ".DS_Store") {
      if (fs.readdirSync("stimuli/" + folder)) {
        categoriesCount.prod[folder] = 0;
        images.prod[folder] = [];
        fs.readdirSync("stimuli/" + folder).forEach(file => {
          if (file == "TestItems") {
            fs.readdirSync("stimuli/" + folder + "/TestItems").forEach(file => {
              if (
                ![
                  ".DS_Store",
                  "Thumbs.db",
                  "extra",
                  "AMC5143AAS_COB_370.jpe"
                ].includes(file)
              )
                images.prod[folder].push(
                  "stimuli/" + folder + "/TestItems/" + file
                );
            });
          }
          if (
            ![
              ".DS_Store",
              "TestItems",
              "Thumbs.db",
              "extra",
              "AMC5143AAS_COB_370.jpe"
            ].includes(file)
          )
            images.prod[folder].push("stimuli/" + folder + "/" + file);
        });
      }
    }
  });
  writer = csvWriter({ headers: Object.keys(categoriesCount.prod) });
  writer.pipe(fs.createWriteStream(categoriesCountProdPath, { flags: "a" }));
  writer.write(categoriesCount.prod);
  writer.end();
}

// POST endpoint for requesting trials
app.post("/trials", function(req, res) {
  console.log("trials post request received");

  let subjCode = req.body.subjCode;
  let numCategories = req.body.numCategories;
  let numPics = req.body.numPics || 17;
  let reset = req.body.reset;
  const dev = req.body.dev == true;
  const env = dev ? "dev" : "prod";
  console.log(`Trials Environment: ${env}`);
  console.log(req.body);

  // subject is not finished
  if (fs.existsSync("trials/" + subjCode + "_trials.txt") && reset == "false") {
    console.log("Grabbing unfinished trials");
    let completed = [];
    const csvFilePath = "data/" + subjCode + "_data.csv";
    csv()
      .fromFile(csvFilePath)
      .on("json", jsonObj => {
        completed.push(jsonObj.image);
      })
      .on("done", error => {
        fs.readFile("trials/" + subjCode + "_trials.txt", "utf8", function(
          err,
          data
        ) {
          if (err) throw err;

          let subjCategories = data.split("\n").filter(c => {
            return !completed.includes(c);
          });
          let subjImages = Object.assign({}, images[env]);
          for (let category in subjImages) {
            subjImages[category] = subjImages[category].filter(
              image => !completed.includes(image)
            );
          }

          let questions = _.shuffle(
            fs
              .readFileSync("IRQ_questions.txt")
              .toString()
              .replace(/\r/g, "\n")
              .split("\n")
          ).filter(line => {
            return line.replace(/ /g, "").length > 0;
          });

          let trials = {
            categories: subjCategories,
            images: subjImages,
            questions: questions,
            categoryNamesMap
          };
          res.send({ success: true, trials: trials });
        });
      });
  }
  // new subject or needs to reset trial data
  else {
    console.log("Creating new trials");

    // removes existing data files if resetting
    if (reset == "true") {
      if (fs.existsSync("trials/" + subjCode + "_trials.txt"))
        fs.unlinkSync("trials/" + subjCode + "_trials.txt");
      if (fs.existsSync("data/" + subjCode + "_data.csv"))
        fs.unlinkSync("data/" + subjCode + "_data.csv");
    }

    let categories = _.shuffle(Object.keys(categoriesCount[env]));
    let countLists = {};
    for (let cat of categories) {
      if (!(categoriesCount[env][cat] in countLists))
        countLists[categoriesCount[env][cat]] = [cat];
      else countLists[categoriesCount[env][cat]].push(cat);
    }

    // Add categories with the least count to subject trials
    let counts = Object.keys(countLists).sort((a, b) => {
      return Number(a) - Number(b);
    });
    let subjCategories = [];
    for (let count of counts) {
      for (let cat of countLists[count]) {
        if (subjCategories.length < numCategories) {
          subjCategories.push(cat);
          categoriesCount[env][cat] =
            Number(categoriesCount[env][cat]) + 1 + "";
        } else break;
      }
    }

    // Write to trials file
    fs.writeFile(
      "trials/" + subjCode + "_trials.txt",
      subjCategories.join("\n"),
      function(err) {
        if (err) return console.log(err);
        console.log("Trials list saved!");
      }
    );

    const categoriesCountDevPath = "categoriesCount.dev.csv";
    const categoriesCountProdPath = "categoriesCount.prod.csv";
    const categoriesCountPath = dev
      ? categoriesCountDevPath
      : categoriesCountProdPath;

    let headers = categories;
    if (!fs.existsSync(categoriesCountPath))
      writer = csvWriter({ headers: headers });
    else writer = csvWriter({ sendHeaders: false });

    writer.pipe(fs.createWriteStream(categoriesCountPath, { flags: "a" }));
    writer.write(categoriesCount[env]);
    writer.end();

    let subjImages = Object.assign({}, images[env]);
    for (let category in subjImages) {
      subjImages[category] = _.shuffle(subjImages[category]).slice(0, numPics);
    }
    let questions = _.shuffle(
      fs
        .readFileSync("IRQ_questions.txt")
        .toString()
        .replace(/\r/g, "\n")
        .split("\n")
    ).filter(line => {
      return line.replace(/ /g, "").length > 0;
    });
    let trials = {
      categories: subjCategories,
      images: subjImages,
      questions: questions,
      categoryNamesMap
    };

    console.log(categoriesCount[env]);
    res.send({ success: true, trials: trials });
  }
});

// POST endpoint for receiving trial responses
app.post("/data", function(req, res) {
  console.log("data post request received");

  // Parses the trial response data to csv
  let response = req.body;
  console.log(response);
  let path = "data/" + response.subjCode + "_data.csv";
  let headers = Object.keys(response);
  if (!fs.existsSync(path)) writer = csvWriter({ headers: headers });
  else writer = csvWriter({ sendHeaders: false });

  writer.pipe(fs.createWriteStream(path, { flags: "a" }));
  writer.write(response);
  writer.end();

  res.send({ success: true });
});

// POST endpoint for receiving trial responses
app.post("/demographics", function(req, res) {
  console.log("demographics post request received");

  // Parses the trial response data to csv
  let demographics = req.body;
  console.log(demographics);
  let path = "demographics/" + demographics.subjCode + "_demographics.csv";
  let headers = Object.keys(demographics);
  writer = csvWriter({ headers: headers });

  writer.pipe(fs.createWriteStream(path, { flags: "w" }));
  writer.write(demographics);
  writer.end();

  res.send({ success: true });
});

// POST endpoint for receiving trial responses
app.post("/IRQ", function(req, res) {
  console.log("IRQ post request received");

  // Parses the trial response data to csv
  let IRQ = req.body;
  console.log(IRQ);
  let path = "IRQ/" + IRQ.subjCode + "_IRQ.csv";
  let headers = Object.keys(IRQ);
  writer = csvWriter({ headers: headers });

  writer.pipe(fs.createWriteStream(path, { flags: "w" }));
  writer.write(IRQ);
  writer.end();

  res.send({ success: true });
});

import express from "express";
import { PORT, mongoDBURL } from "./config.js";
import mongoose from "mongoose";
import booksRoute from "./routes/booksRoute.js";
import cors from "cors";
import multer from "multer";
import Images from "./models/imageDetail.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import PDFUpload from "./models/pdfModel.js";
import Patient from "./models/patientModel.js";
import bcrypt from 'bcrypt';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


app.use(express.json());
app.use(cors());

app.get("/", (request, response) => {
  console.log(request);
  return response.status(234).send("Welcome To MERN Stack Tutorial");
});

app.listen(PORT, () => {
  console.log(`App is listening to port: ${PORT}`);
});

app.use("/books", booksRoute);

const imagesDirectory = path.join(__dirname, "../frontend/public/images");
const pdfDirectory = path.join(__dirname, '../frontend/public/pdf');
const imagesDirectory2 = path.join(__dirname, "../frontend/public/images");
const pdfDirectory2 = path.join(__dirname, '../frontend/public/pdf');

if (!fs.existsSync(imagesDirectory)) {
  fs.mkdirSync(imagesDirectory, { recursive: true });
}

if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDirectory);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const upload = multer({ storage: storage });

const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pdfDirectory);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const uploadPDF = multer({ storage: pdfStorage });

const pdfEditStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pdfDirectory2);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});



const pictureEditStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDirectory2);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const editPDF = multer({ storage: pdfEditStorage });
const editPicture = multer({ storage: pictureEditStorage });

app.post("/upload-image", upload.fields([{ name: "image", maxCount: 1 }, { name: "imageSecond", maxCount: 1 }]), async (req, res) => {
  const {
    username,
    firstName,
    surname,
    dob,
    icNo,
    gender,
    address,
    mobileNo,
    email,
    hospitalName,
    department,
    position,
    mmcRegistrationNo,
  } = req.body;

  try {
    const imageDetails = new Images({
      image: req.files["image"][0].filename, // Get the first image
      imageSecond: req.files["imageSecond"][0].filename, // Get the second image
      username,
      firstName,
      surname,
      dob,
      icNo,
      gender,
      address,
      mobileNo,
      email,
      hospitalName,
      department,
      position,
      mmcRegistrationNo,
    });

    const savedImage = await imageDetails.save();
    res.json({ image: savedImage.image });
  } catch (err) {
    console.log(err.message);
    res.status(400).send({ message: err.message });
  }
});

app.post('/pdf-upload', uploadPDF.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'title', maxCount: 1 },
  { name: 'picture', maxCount: 1 },
  { name: 'description', maxCount: 1 },
]), async (req, res) => {
  if (!req.files) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const pdfFile = req.files['pdfFile'][0].filename;
    const picture = req.files['picture'][0].filename; // Access the 'picture' file

    // Create a new document using the PDFUpload model and save it to the database
    const newPDFUpload = new PDFUpload({
      pdfFileName: pdfFile,
      title: req.body.title,
      picture: picture, // Store the 'picture' filename
      description: req.body.description,
      // Add any other fields and data you want to store in the document
    });

    const savedPDFUpload = await newPDFUpload.save();

    res.json({
      message: 'PDF file uploaded successfully',
      pdfFile: savedPDFUpload.pdfFileName,
      // Add other data from the saved document as needed
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/pdf-upload', async (req, res) => {
  try {
    const pdfUploadData = await PDFUpload.find();
    res.json(pdfUploadData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/pdf-upload/:id', async (req, res) => {
  try {
    const pdfUploadData = await PDFUpload.findById(req.params.id);
    if (!pdfUploadData) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    res.json(pdfUploadData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});


app.put('/pdf-upload/:id', uploadPDF.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'title', maxCount: 1 },
  { name: 'picture', maxCount: 1 },
  { name: 'description', maxCount: 1 },
]), async (req, res) => {
  try {
    const pdfId = req.params.id; // Extract the PDF ID from the route parameter
    const pdfFile = req.files && req.files['pdfFile'] && req.files['pdfFile'][0] && req.files['pdfFile'][0].filename;
    const picture = req.files && req.files['picture'] && req.files['picture'][0] && req.files['picture'][0].filename;
    const { title, description } = req.body;

    // Check if pdfFile and picture are defined before using them
    if (!pdfFile || !picture) {
      return res.status(400).json({ message: 'Missing PDF file or picture' });
    }

    // Find the PDF by ID
    const existingPdf = await PDFUpload.findById(pdfId);

    if (!existingPdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Update the fields of the existing PDF
    existingPdf.pdfFileName = pdfFile;
    existingPdf.title = title;
    existingPdf.picture = picture;
    existingPdf.description = description;

    // Save the updated PDF
    const updatedPdf = await existingPdf.save();

    res.json({ message: 'PDF updated successfully', updatedPdf });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});





app.delete('/pdf-upload/:id', async (req, res) => {
  try {
    const pdfUploadData = await PDFUpload.findByIdAndDelete(req.params.id);

    if (!pdfUploadData) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    res.json({ message: 'PDF deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get("/get-image", async (req, res) => {
  try {
    const images = await Images.find({}, "image imageSecond username firstName surname dob icNo gender address mobileNo email hospitalName department position mmcRegistrationNo");
    res.json({ data: images });
  } catch (err) {
    console.log(err.message);
    res.status(400).send({ message: err.message });
  }
});

app.get("/get-image/:id", async (req, res) => {
  try {
    const imageId = req.params.id;

    // Assuming "Images" is your Mongoose model
    const image = await Images.findById(imageId);

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // You can choose which fields to include in the response
    const responseData = {
      image: image.image,
      imageSecond: image.imageSecond,
      username: image.username,
      firstName: image.firstName,
      surname: image.surname,
      dob: image.dob,
      icNo: image.icNo,
      gender: image.gender,
      address: image.address,
      mobileNo: image.mobileNo,
      email: image.email,
      hospitalName: image.hospitalName,
      department: image.department,
      position: image.position,
      mmcRegistrationNo: image.mmcRegistrationNo,
    };

    res.json(responseData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send({ message: "Server Error" });
  }
});

app.delete("/get-image/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Images.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "Apply user not found" });
    }
    return res.status(200).send({ message: "Applying user deleted successfully" });
  } catch (error) {
    console.log(error.message);
    response.status(500).send({ message: error.message });
  }
});

//patient profile
app.post('/addPatients', async (req, res) => {
  const {
    firstName,
    surname,
    dob,
    mrnNo,
    icNo,
    gender,
    mobileNo,
    email,
    ethnicity,
    password,
    nextOfKinFirstName,
    nextOfKinSurname,
    nextOfKinMobileNo,
  } = req.body;

  try {
    // Hash the password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const patient = new Patient({
      firstName,
      surname,
      dob,
      mrnNo,
      icNo,
      gender,
      mobileNo,
      email,
      ethnicity,
      password: hashedPassword, // Store the hashed password
      nextOfKin: {
        firstName: nextOfKinFirstName,
        surname: nextOfKinSurname,
        mobileNo: nextOfKinMobileNo,
      },
    });

    const savedPatient = await patient.save();
    res.json({ patient: savedPatient });
  } catch (err) {
    console.log(err.message);
    res.status(400).send({ message: err.message });
  }
});



app.get('/getPatients', async (req, res) => {
  try {
    // Assuming you have a model named "Patient" for patient data
    const patients = await Patient.find();

    res.json({ patients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/getPatientById/:id', async (req, res) => {
  try {
    const patientId = req.params.id;

    // Assuming you have a model named "Patient" for patient data
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({ patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.delete('/deletePatient/:id', async (req, res) => {
  try {
    // Extract the patient's ID from the request parameters
    const patientId = req.params.id;

    // Check if the patient exists
    const patient = await Patient.findByIdAndDelete(patientId);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // If the patient exists, delete them
   

    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.put('/updatePatient/:id', async (req, res) => {
  try {
    const patientId = req.params.id;
    const updateData = req.body; // The updated data is expected in the request body

    // Assuming you have a model named "Patient" for patient data
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Update the patient's information with the data from the request body
    patient.firstName = updateData.firstName;
    patient.surname = updateData.surname;
    patient.dob = updateData.dob;
    patient.mrnNo = updateData.mrnNo;
    patient.icNo = updateData.icNo;
    patient.gender = updateData.gender;
    patient.mobileNo = updateData.mobileNo;
    patient.email = updateData.email;
    patient.ethnicity = updateData.ethnicity;

    // Update nextOfKin data
    patient.nextOfKin.firstName = updateData.nextOfKin.firstName;
    patient.nextOfKin.surname = updateData.nextOfKin.surname;
    patient.nextOfKin.mobileNo = updateData.nextOfKin.mobileNo;

    // Save the updated patient data
    await patient.save();

    res.json({ message: 'Patient updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




mongoose
  .connect(mongoDBURL)
  .then(() => {
    console.log("App connected to database");
  })
  .catch((error) => {
    console.log(error);
  });

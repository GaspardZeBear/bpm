import express from 'express'
import cors from 'cors'
import path from 'path'
//import { convertImagesToBase64JSON } from './jpg2b64.mjs'
//import { ServerPage } from './ServerPage.mjs'
import { fileURLToPath } from 'url';
import fs from 'fs'


// Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 1961;

app.use(express.json());
app.use(cors());

let counter=0
app.post('/log', (req, res) => {
  // Handle POST request logic here
  //console.log("post ",req.body)
  //let message = JSON.stringify(req.body.tmstp)
  // message += " " + JSON.stringify(req.body.t)
  //message += JSON.stringify(req.body.msg); // Assuming data has a key 'message'
  // Process the data here (e.g., store in database, send an email)
  counter += 1
  //console.log("Received ", counter)
  let message = JSON.stringify(req.body)
  console.log("Received ", counter, " message ", message)
  
   fs.appendFile('X.log', message+"\n", (err) => {
    if (err) {
      console.error('Error when writing file:', err);
      return;
    }
  })
  
  res.send('POST request received successfully!');
})



// Start the server
app.listen(port, () => {
  console.log(`LogServer app listening at http://localhost:${port}`);
}); 

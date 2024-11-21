import { useState, useEffect } from "react";
import {
  Authenticator,
  Button,
  Text,
  TextField,
  Heading,
  Flex,
  View,
  Grid,
  Divider,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { getUrl } from "aws-amplify/storage";
import { uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

import * as pdfjsLib from "pdfjs-dist";


// Set the workerSrc to the location of the pdf.js worker script
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;

export default function App() {
  const [pdfs, setPdfs] = useState([]);

  useEffect(() => {
    setPdfs([]);
  }, []);

  // Function to extract text from the PDF using pdf.js
  async function extractTextFromPdf(file) {
    const reader = new FileReader();

    reader.onload = async function () {
      const pdfData = new Uint8Array(reader.result);

      try {
        // Load the PDF document
        const pdfDocument = await pdfjsLib.getDocument(pdfData).promise;

        let fullText = "";
        const numPages = pdfDocument.numPages;

        // Iterate over each page and extract text
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ");
          fullText += pageText + "\n";
        }

        // Log the extracted text to the console
        console.log("Extracted PDF Text:", fullText);
      } catch (error) {
        console.error("Error extracting PDF text:", error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // Handling the PDF file upload and processing
  async function uploadPdf(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const file = form.get("pdf");

    // Log the name of the uploaded PDF
    console.log("Uploaded PDF Name:", file.name);

    // Extract and log text from the PDF
    extractTextFromPdf(file);

    event.target.reset();
  }

  // Function to delete a PDF (if you want to manage local state or handle it differently)
  async function deletePdf({ id }) {
    const updatedPdfs = pdfs.filter((pdf) => pdf.id !== id);
    setPdfs(updatedPdfs);
  }

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          justifyContent="center"
          alignItems="center"
          direction="column"
          width="70%"
          margin="0 auto"
        >
          <Heading level={1}>My PDF Uploader App</Heading>
          <View as="form" margin="3rem 0" onSubmit={uploadPdf}>
            <Flex
              direction="column"
              justifyContent="center"
              gap="2rem"
              padding="2rem"
            >
              <TextField
                name="name"
                placeholder="PDF Name"
                label="PDF Name"
                labelHidden
                variation="quiet"
                required
              />
              <View
                name="pdf"
                as="input"
                type="file"
                alignSelf={"end"}
                accept="application/pdf"
              />
              <Button type="submit" variation="primary">
                Upload PDF
              </Button>
            </Flex>
          </View>
          <Divider />
          <Heading level={2}>Uploaded PDFs</Heading>
          <Grid
            margin="3rem 0"
            autoFlow="column"
            justifyContent="center"
            gap="2rem"
            alignContent="center"
          >
            {pdfs.map((pdf) => (
              <Flex
                key={pdf.id || pdf.name}
                direction="column"
                justifyContent="center"
                alignItems="center"
                gap="2rem"
                border="1px solid #ccc"
                padding="2rem"
                borderRadius="5%"
                className="box"
              >
                <View>
                  <Heading level="3">{pdf.name}</Heading>
                </View>
                <Button
                  variation="destructive"
                  onClick={() => deletePdf(pdf)}
                >
                  Delete PDF
                </Button>
              </Flex>
            ))}
          </Grid>
          <Button onClick={signOut}>Sign Out</Button>
        </Flex>
      )}
    </Authenticator>
  );
}

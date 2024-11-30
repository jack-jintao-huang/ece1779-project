import { useState, useEffect } from "react";
import "./App.css";

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
import axios from "axios"
/**
 * @type {import('aws-amplify/data').Client<import('../amplify/data/resource').Schema>}
 */

Amplify.configure(outputs);
const client = generateClient({
  authMode: "userPool",
});

import * as pdfjsLib from "pdfjs-dist";

// Set the workerSrc to the location of the pdf.js worker script
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

export default function App() {
  const [pdfs, setPdfs] = useState([]);
  const [extractedText, setExtractedText] = useState("");
  const [pdfSummary, setPdfSummary] = useState(
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");
  

  useEffect(() => {
    fetchPdfs();
  }, []);

  async function fetchPdfs() {
    const { data: pdfs } = await client.models.Pdf.list();

    await Promise.all(
      pdfs.map(async (pdf) => {
        if (pdf.pdfUrl) {
          const linkToStorageFile = await getUrl({
            path: ({ identityId }) => `pdf/${identityId}/${pdf.pdfUrl}`,
          });
          console.log("pdf url: " + linkToStorageFile);
          pdf.pdfUrl = linkToStorageFile.url;
        }
        if (pdf.summary) {
          const linkToStorageFile = await getUrl({
            path: ({ identityId }) => `summaries/${identityId}/${pdf.summary}`,
          });
          console.log("summary: " + pdf.summary);
        }
        return pdf;
      })
    );
    console.log(pdfs);
    setPdfs(pdfs);
  }

  // Function to extract text from the PDF using pdf.js
  async function extractTextFromPdf(file) {
    const reader = new FileReader();

    reader.onload = async function () {
      const pdfData = new Uint8Array(reader.result);

      try {
        const pdfDocument = await pdfjsLib.getDocument(pdfData).promise;
        let fullText = "";
        const numPages = pdfDocument.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ");
          fullText += pageText + "\n";
          
        }
        setExtractedText(fullText); // Update state with extracted text
        setPdfSummary("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");


        console.log("Extracted PDF Text:", fullText);
      } catch (error) {
        console.error("Error extracting PDF text:", error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function uploadPdf(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const file = form.get("pdf");

    console.log("Uploaded PDF Name:", file.name);

    extractTextFromPdf(file);
    await extractTextFromPdf(file); // Extract and set the text during upload

    setPdfSummary("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.");



    const { data: newPdf } = await client.models.Pdf.create({
      name: form.get("name"),
      pdfUrl: file.name,
      summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    });

    const { key } = await uploadData({
      path: ({ identityId }) => `pdf/${identityId}/${file.name}`,
      data: file,
    });

    console.log("New PDF:", newPdf);

    fetchPdfs();

    event.target.reset();
  }

  async function deletePdf({ id }) {
    const toBeDeleted = {
      id: id,
    };
    const { data: deletedPdf } = await client.models.Pdf.delete(toBeDeleted);
    console.log("Deleted PDF:", deletedPdf);

    fetchPdfs();
  }

  //openAI api call ref: https://dev.to/jehnz/integrating-openai-api-with-a-react-application-3378
  async function processText() {
    if (!extractedText) {
      console.error("No text extracted to process:", error)
      return;
    }
    // for testing purposes
    const textFragment = extractedText.substring(0, 100);
    const API_KEY = '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';

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {role: "system", content: "You are a legal assistant."},
            {role: "user", content: `Summarize teh following text:\n\n"${textFragment}"`}
          ],
          max_tokens: 100,
          temperature: 0.7
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      const processedText = response.data.choices[0].message.content.trim();
      console.log("Processed Text:", processedText);
    } catch (error) {
      console.error("Error processing OpenAI request:", error.response ? error.response.data : error.message);
    }
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
          <Button
            onClick={signOut}
            style={{
              position: "fixed",
              top: "1rem",
              right: "1rem",
              fontSize: "16px",
              textDecoration: "none",
            }}
          >
            Sign Out
          </Button>

          <Flex
            className="App"
            justifyContent="center"
            alignItems="center"
            direction="column"
            width="100%"
            height="20vh"
            margin="0 auto"
          >
            <Heading level={1}>Welcome to the Contract Summarizer</Heading>
          </Flex>
          <Divider />

          <Flex
            className="App"
            justifyContent="center"
            alignItems="center"
            direction="column"
            width="100%"
            height="60vh"
            margin="0 auto"
          >
            <Heading level={3}>Upload Your PDF Here!</Heading>
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
                <Button type="submit">
                  Upload PDF
                </Button>
              </Flex>
            </View>
          </Flex>
          {/* Placeholder Summary Section */}
          <Flex 
            direction="column" 
            justifyContent="center" 
            alignItems="center" 
            gap="1rem" 
            marginTop="3rem"
          >
            <Heading level={3}>Summary of Uploaded PDF</Heading>

            <View
              style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                backgroundColor: "#f9f9f9",
                maxWidth: "80%",
                textAlign: "justify",
                lineHeight: "1.6",
                }}
              >
                {pdfSummary}
            </View>
          </Flex>

          {/* Placeholder Extracted Text */}
          <Flex 
            direction="column" 
            justifyContent="center" 
            alignItems="center" 
            gap="1rem" 
            marginTop="3rem"
          >
            <Heading level={3}>Extracted Text</Heading>

            <View
              style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                backgroundColor: "#f3f3f3",
                maxWidth: "80%",
                textAlign: "justify",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap", // Ensures proper formatting of line breaks in extracted text
              }}
            >
              {/* Display a shortened version of the text */}
              {extractedText
                ? extractedText.substring(0, 100) + (extractedText.length > 100 ? "..." : "")
                : "No text extracted yet."}
            </View>

            {/* placeholder for API call */}
            <Button 
              onClick={processText} // Call processText when clicked
              style={{
                marginTop: "1rem",
                padding: "10px 20px",
                fontSize: "16px",
              }}
            >
              Process Text
            </Button>
            
          </Flex>

          <Divider />  

          <Heading level={3}>Uploaded PDFs</Heading>
          <Grid
            margin="3rem 0"
            autoFlow="col"
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
                  <Heading level="6">{pdf.name}</Heading>
                </View>
                <View>
                  <Heading level="7">{pdf.summary}</Heading>
                </View>
                <Flex direction="row" gap="1rem">
              <Button
                onClick={() => window.open(pdf.pdfUrl, "_blank")}
                variation="primary"
              >
                View
              </Button>
              <Button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = pdf.pdfUrl;
                  link.download = pdf.name || "download.pdf";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                variation="secondary"
              >
                Download
              </Button>
              </Flex>
              <Button
                variation="destructive"
                onClick={() => deletePdf(pdf)}
              >
                Delete PDF
              </Button>

              </Flex>
            ))}
          </Grid>

          <Flex
            className="App"
            justifyContent="center"
            alignItems="center"
            direction="column"
            width="100%"
            height="40vh"
            margin="0 auto"
          >
            <Heading level={2}>About This Project</Heading>
            <Text>
              This project was developed by Dylan, Jack, Jay, and Arham, focusing
              on creating an easy and intuitive PDF uploading and processing
              extraction solution.
            </Text>
            <Text>
              The goal is to provide a seamless user experience for uploading,
              processing, and extracting PDF information files for various
              applications.
            </Text>
          </Flex>
        </Flex>
      )}
    </Authenticator>
  );
}

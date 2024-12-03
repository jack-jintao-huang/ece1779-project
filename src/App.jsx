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
  const [pdfSummary, setPdfSummary] = useState("");
  const [parsedCategories, setParsedCategories] = useState({
    partiesInvolved: "",
    keyClauses: "",
    datesAndTimelines: "",
    obligationsAndLiabilities: "",
    summary: "",
  });
  

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

        console.log("Extracted PDF Text:", fullText);
        return fullText;
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

    fullText = await extractTextFromPdf(file); // Extract and set the text during upload
    await processText(fullText);

    const { data: newPdf } = await client.models.Pdf.create({
      name: form.get("name"),
      pdfUrl: file.name,
      summary: pdfSummary || "No summary generated.",
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
  async function processText(fullText) {
    if (!extractedText) {
      console.error("No text extracted to process:", error)
      return;
    }
    // for testing purposes
    const API_KEY = 'PLACEHOLD';

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            { role: "system",
              content: "You are a legal assistant trained to analyze and process legal documents."
            },
            { role: "user",
              content: `Analyze the following legal document text and extract the required details efficiently and concisely:
              1. Parties Involved: List the names of all parties mentioned in the document.
              2. Key Clauses: Summarize the following clauses in 1 sentence each:
              - Confidentiality
              - Indemnification
              - Termination
              - Liability and obligations
              - Dispute resolution
              3. Dates and Timelines: Extract all relevant dates and timelines, including:
              - Start and end dates of the contract
              - Deadlines for obligations or deliverables
              - Renewal or termination dates
              4. Obligations and Liabilities: Summarize the main obligations and liabilities of each party in 1 sentence each.
              5. Summary: Provide a concise summary of the document's key points, including purpose, scope, and any other critical terms in 2-3 sentences.

              Document Text:
              ${extractedText}`,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      // extract response
      const modelResponse = response.data.choices[0].message.content.trim();
      console.log("Model Response: \n", modelResponse);

      // parsed response
      const parsedResponse = parseResponse(modelResponse);
      setPdfSummary(parsedResponse.summary || "No summary available.");
      setParsedCategories(parsedResponse);

    } catch (error) {
      console.error("Error processing OpenAI request:", error.response ? error.response.data : error.message);
    }
  }

  // parse response into categories
  function parseResponse(response) {
    const sections = {
      partiesInvolved: extractSection(response, "1\\. Parties Involved"),
      keyClauses: extractSection(response, "2\\. Key Clauses"),
      datesAndTimelines: extractSection(response, "3\\. Dates and Timelines"),
      obligationsAndLiabilities: extractSection(
        response,
        "4\\. Obligations and Liabilities"
      ),
      summary: extractSection(response, "5\\. Summary"),
    };
  
    return sections;
  }
  
  // Helper function to extract specific sections
  function extractSection(text, sectionName) {
    // Matches text for the given section name until the next numbered section
    const regex = new RegExp(
      `${sectionName}:([\\s\\S]*?)(?=\\n\\d\\. |$)`, // Match from sectionName until the next numbered heading or the end of text
      "i"
    );
    const match = text.match(regex);
    return match ? match[1] : "No information available.";
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

          <Flex direction="column" justifyContent="center" alignItems="center" gap="1rem" marginTop="3rem">
            <Heading level={3}>Detailed Analysis</Heading>

            <View style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#f9f9f9", maxWidth: "80%", textAlign: "justify", lineHeight: "1.6" }}>
              <Text>
                <strong>Parties Involved:</strong> <br />
                {parsedCategories.partiesInvolved || "No information available."}
              </Text>
              <Divider />
              <Text>
                <strong>Key Clauses:</strong> <br />
                {parsedCategories.keyClauses || "No information available."}
              </Text>
              <Divider />
              <Text>
                <strong>Dates and Timelines:</strong> <br />
                {parsedCategories.datesAndTimelines || "No information available."}
              </Text>
              <Divider />
              <Text>
                <strong>Obligations and Liabilities:</strong> <br />
                {parsedCategories.obligationsAndLiabilities || "No information available."}
              </Text>
              <Divider />
              <Text>
                <strong>Summary:</strong> <br />
                {parsedCategories.summary || "No summary available."}
              </Text>
            </View>
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

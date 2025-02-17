import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ChromaClient } from "chromadb";
dotenv.config();

const chromaClient = new ChromaClient({ path: "http://localhost:8000" });
chromaClient.heartbeat();

const WEB_SCRAPPED_COLLECTION = "web_scrapped";

const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;
const openai = new OpenAI({
  apiKey: OPEN_AI_API_KEY,
});

async function scrapWeb(url) {
  console.log("Scraping URL: ", url);

  try {
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    const pageHead = $("head").html();
    const pageBody = $("body").html();

    const externalLinks = new Set();
    const internalLinks = new Set();

    $("a").each((index, element) => {
      const link = $(element).attr("href");
      if (!link) return;
      if (
        link.startsWith("javascript:") ||
        link.startsWith("mailto:") ||
        link.startsWith("tel:") ||
        link.startsWith("#")
      ) {
        return; // skip unsupported protocols
      } else if (link.startsWith("/")) {
        // Optionally, convert relative URLs to absolute ones based on the current URL
        return;
      } else if (link.startsWith("http")) {
        externalLinks.add(link);
      } else {
        internalLinks.add(link);
      }
    });

    return {
      pageHead,
      pageBody,
      internalLinks: Array.from(internalLinks),
      externalLinks: Array.from(externalLinks),
    };
  } catch (err) {
    console.log('problem in scrapping', 'error', err , 'url', url);
  }
}

async function generateVectorEmbedding({ text }) {
  console.log("Generating Vector Embedding for: ", text);
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: JSON.stringify({
      text: text,
    }),
    encoding_format: "float",
  });

  return embedding.data[0].embedding;
}

async function ingest(url = "") {
  console.log("Ingesting URL: ", url);
  const { pageHead, pageBody, internalLinks } = await scrapWeb(url);

  const pageHeadEmbedding = await generateVectorEmbedding({ text: pageHead });
  await insertIntoChromaDB({ embedding: pageHeadEmbedding, url: url });

  const bodyChunks = chunkText(pageBody, 5000);
  const bodyEmbeddings = [];
  for (const chunk of bodyChunks) {
    const embedding = await generateVectorEmbedding({ text: chunk });
    bodyEmbeddings.push(embedding);
    await insertIntoChromaDB({ embedding: embedding, url: url });
  }

  for (const link of internalLinks) {
    // recursively call ingest
    const passedUrl = new URL(link, url).href;
    await ingest(passedUrl);
  }
}

function chunkText(text, chunkSize) {
  if (text.length <= chunkSize) return [text];
  const chunks = [];
  let currentChunk = "";
  const words = text.split(" ");
  for (const word of words) {
    if (currentChunk.length + word.length <= chunkSize) {
      currentChunk += word + " ";
    } else {
      chunks.push(currentChunk);
      currentChunk = word + " ";
    }
  }
  chunks.push(currentChunk);
  return chunks;
}



// db operation
async function insertIntoChromaDB({ embedding, url }) {
  console.log("Inserting into ChromaDB: ", url);
  const collection = await chromaClient.getOrCreateCollection({
    name: WEB_SCRAPPED_COLLECTION,
  });

  await collection.add({
    ids: [url],
    embeddings: [embedding],
    metadatas: [{ url: url }],
    // Optionally, you can provide a documents field if needed:
    // documents: [pageContent]
  });
}

ingest("https://pro.piyushgarg.dev/");



async function chat(question = '') {
    //embed the question
    const questionEmbedding = await generateVectorEmbedding({text: question});

    

}

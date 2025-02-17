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
  console.log("Scraping URL:", url);

  try {
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);
    const pageHead = $("head").text(); // or .html()
    const pageBody = $("body").text(); // or .html()

    // If you prefer the raw HTML, use .html(). 
    // For better semantic retrieval, .text() is usually more relevant.

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
        // skip unsupported protocols, anchors, etc.
        return;
      } else if (link.startsWith("/")) {
        // Optionally, turn relative paths into absolute:
        const absoluteUrl = new URL(link, url).href;
        internalLinks.add(absoluteUrl);
      } else if (link.startsWith("http")) {
        externalLinks.add(link);
      } else {
        // Possibly some other protocol or relative path
        internalLinks.add(new URL(link, url).href);
      }
    });

    return {
      pageHead,
      pageBody,
      internalLinks: Array.from(internalLinks),
      externalLinks: Array.from(externalLinks),
    };
  } catch (err) {
    console.log("Problem scraping", err, "url", url);
    return { pageHead: "", pageBody: "", internalLinks: [], externalLinks: [] };
  }
}

async function generateVectorEmbedding(text) {
  // Use a standard embedding model (e.g., text-embedding-ada-002)
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return embeddingResponse.data[0].embedding;
}

// -----------------------------------------
// DB operation
// Modify the function signature so we can pass
// a custom ID rather than overwriting the same ID
async function insertIntoChromaDB({ id, embedding, url, document = null }) {
  console.log("Inserting into ChromaDB with ID:", id);
  const collection = await chromaClient.getOrCreateCollection({
    name: WEB_SCRAPPED_COLLECTION,
  });

  await collection.add({
    ids: [id], // must be unique across all entries
    embeddings: [embedding],
    metadatas: [{ url }],
    documents: document ? [document] : undefined,
  });
}

function chunkText(text, chunkSize = 2000) {
  // Basic chunking by words or characters
  if (!text || text.length <= chunkSize) return [text];

  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    const currentLength = currentChunk.join(" ").length;
    if (currentLength + word.length <= chunkSize) {
      currentChunk.push(word);
    } else {
      chunks.push(currentChunk.join(" "));
      currentChunk = [word];
    }
  }
  // Push the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

const visited = new Set();

async function ingest(url) {
  // 1. Check if we've already visited this URL
  if (visited.has(url)) {
    return; // skip if already processed
  }
  visited.add(url);

  console.log("Ingesting URL:", url);
  const { pageHead, pageBody, internalLinks } = await scrapWeb(url);

  // 2. Store content in Chroma
  if (pageHead) {
    const headEmbedding = await generateVectorEmbedding(pageHead);
    await insertIntoChromaDB({
      id: `${url}-head`,
      embedding: headEmbedding,
      url,
      document: pageHead,
    });
  }

  if (pageBody) {
    const bodyChunks = chunkText(pageBody, 2000);
    let chunkIndex = 0;
    for (const chunk of bodyChunks) {
      if (!chunk.trim()) continue;
      const embedding = await generateVectorEmbedding(chunk);
      await insertIntoChromaDB({
        id: `${url}-chunk-${chunkIndex}`,
        embedding,
        url,
        document: chunk,
      });
      chunkIndex++;
    }
  }

  // 3. Recursively ingest internal links
  //    But only if we haven't visited them before (the set check above).
  for (const link of internalLinks) {
    await ingest(link);
  }
}

// -----------------------------------------
// Chat function
async function chat(question = "") {
  // 1) Embed the question
  const questionEmbedding = await generateVectorEmbedding(question);

  // 2) Query from your Chroma collection
  const collection = await chromaClient.getOrCreateCollection({
    name: WEB_SCRAPPED_COLLECTION,
  });

  const results = await collection.query({
    queryEmbeddings: [questionEmbedding],
    nResults: 5,
    include: ["documents", "metadatas", "distances"],
  });

  console.log("Query Result:", results);

  // 3) Build the context from retrieved docs
  //    Each results.documents is an array of arrays (since multi-query is possible).
  //    We'll just pick the first array of docs.
  const retrievedDocs = results.documents && results.documents[0];
  if (!retrievedDocs || retrievedDocs.length === 0) {
    console.log("No relevant documents found.");
    return;
  }

  // Concatenate the retrieved docs for context
  const context = retrievedDocs.join("\n\n");

  // 4) Generate a final answer using OpenAI's Chat Completion
  const prompt = `Answer the following question based on the context below.\n\nContext:\n${context}\n\nQuestion: ${question}`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt },
    ],
  });

  const answer = response.choices[0].message.content;
  console.log("Answer:", answer);
  return answer;
}

// -----------------------------------------
// Example usage:

(async () => {
  // Ingest the site
  // await ingest("https://www.piyushgarg.dev/");

  // Then ask a question
  await chat("What is cohort is about?");
})();

'use server'

import { Document } from "llamaindex/Node";
import { VectorStoreIndex, VectorIndexRetriever } from "llamaindex/indices/vectorStore/index";
import { ContextChatEngine } from "llamaindex/engines/chat/ContextChatEngine";
import { OllamaEmbedding } from "llamaindex/embeddings/OllamaEmbedding";
import { serviceContextFromDefaults } from "llamaindex/ServiceContext";
import { Ollama } from "llamaindex/llm/ollama";
import fs from 'fs';
import cron from 'node-cron';
import pino from 'pino';
import { performance } from 'perf_hooks';
import { ChatMessage } from "@/components/ChatWindow";

interface LCDoc {
  pageContent: string;
  metadata: any;
}

const embedModel = new OllamaEmbedding({
  model: 'nomic-embed-text',
});

const llm = new Ollama({
  model: "phi",
  options: {
    temperature: 0,
  },
});

let chatEngine: ContextChatEngine | null = null;
let retriever: VectorIndexRetriever | null = null;
let index: VectorStoreIndex | null = null;

// Initialize logger
const logger = pino({ level: 'info' });

export async function preprocessDocuments(lcDocs: LCDoc[]): Promise<Document[]> {
  return lcDocs.map((doc) => new Document({
    text: doc.pageContent.replace(/\s+/g, ' ').trim(), // Normalize whitespace
    metadata: { ...doc.metadata, wordCount: doc.pageContent.split(' ').length }, // Enrich metadata
  }));
}

export async function validateDocuments(docs: Document[]): Promise<boolean> {
  return docs.every((doc) => doc.text.length > 0 && doc.metadata != null);
}

export async function optimizeIndexParameters(docs: Document[]) {
  const avgDocLength = docs.reduce((sum, doc) => sum + doc.text.length, 0) / docs.length;

  const optimalChunkSize = avgDocLength > 1000 ? 500 : 300;
  const optimalChunkOverlap = avgDocLength > 1000 ? 50 : 20;

  logger.info(`Optimizing index with chunk size: ${optimalChunkSize}, overlap: ${optimalChunkOverlap}`);

  return {
    chunkSize: optimalChunkSize,
    chunkOverlap: optimalChunkOverlap,
  };
}

export async function processDocsAsync(lcDocs: LCDoc[]): Promise<void> {
  const docs = await preprocessDocuments(lcDocs);

  if (!validateDocuments(docs)) {
    throw new Error("Document validation failed.");
  }

  logDocumentProcessing(docs);

  const indexParams = await optimizeIndexParameters(docs);

  index = await VectorStoreIndex.fromDocuments(docs, {
    serviceContext: serviceContextFromDefaults({
      chunkSize: indexParams.chunkSize,
      chunkOverlap: indexParams.chunkOverlap,
      embedModel,
      llm,
    }),
  });

  if (!index) {
    throw new Error("Failed to create VectorStoreIndex.");
  }

  retriever = index.asRetriever({ similarityTopK: 2 });

  if (chatEngine) {
    chatEngine.reset();
  }

  chatEngine = new ContextChatEngine({
    retriever,
    chatModel: llm,
  });

  logger.info("Asynchronous document processing completed.");

  const summaries = await summarizeDocuments(lcDocs);
  summaries.forEach((summary, index) => logger.info(`Summary of Document ${index + 1}: ${summary}`));

  scheduleIndexRefresh('0 0 * * *', lcDocs); // Every day at midnight
}

export async function chat(query: string) {
  if (!chatEngine) {
    throw new Error("Chat engine is not initialized.");
  }

  logger.info("Querying chat engine:", query);

  const queryResult = await chatEngine.chat({
    message: query,
  });

  logger.info("Chat result:", queryResult);

  const response = queryResult.response;
  const metadata = queryResult.sourceNodes?.map((node: any) => node.metadata);

  if (!response) {
    logger.error("Chat response is empty.");
    throw new Error("No response from the chat engine.");
  }

  logger.info("Chat response:", response);
  return { response, metadata };
}

export async function resetChatEngine() {
  if (chatEngine) {
    chatEngine.reset();
    logger.info("Chat engine reset.");
  } else {
    logger.warn("Chat engine is not initialized.");
  }
}

export async function saveChat(messages: ChatMessage[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `./chats/chat-${timestamp}.json`;

  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
  logger.info(`Chat saved to ${filePath}`);
}

export async function exportChat(messages: ChatMessage[]) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `./chats/chat-${timestamp}.txt`;

  const chatContent = messages.map((msg) => `${msg.role === 'ai' ? 'AI' : 'Human'}: ${msg.statement}`).join('\n');
  fs.writeFileSync(filePath, chatContent);
  logger.info(`Chat exported to ${filePath}`);
}

export async function logDocumentProcessing(docs: Document[]) {
  docs.forEach((doc, index) => {
    logger.info({ docIndex: index, wordCount: doc.text.split(' ').length }, `Processing Document ${index + 1}`);
  });
}

export async function logQueryExecution(query: string, response: string, metadata: any) {
  logger.info({ query, response, metadata }, 'Executed chat query');
}

export async function logError(error: Error, context: string) {
  logger.error({ error, context }, 'An error occurred');
}

export async function summarizeDocuments(lcDocs: LCDoc[]): Promise<string[]> {
  return lcDocs.map((doc) => {
    const sentences = doc.pageContent.split('. ');
    const summary = sentences.slice(0, 3).join('. ') + '...'; // Simple summary: first 3 sentences
    return summary;
  });
}

export async function exportIndex(filePath: string) {
  if (!index) {
    throw new Error("Index is not initialized.");
  }

  fs.writeFileSync(filePath, JSON.stringify(index, null, 2));
  logger.info(`Index exported to ${filePath}`);
}

export async function scheduleIndexRefresh(interval: string, lcDocs: LCDoc[]) {
  cron.schedule(interval, async () => {
    logger.info('Refreshing document index...');
    await processDocsAsync(lcDocs);
    logger.info('Document index refreshed.');
  });
}

export async function measureProcessingTime(lcDocs: LCDoc[]) {
  const startTime = performance.now();

  await processDocsAsync(lcDocs);

  const endTime = performance.now();
  logger.info(`Processing time: ${(endTime - startTime).toFixed(2)} ms`);
}

export async function reloadDocuments(lcDocs: LCDoc[]) {
  logger.info('Reloading documents and refreshing index...');
  await processDocsAsync(lcDocs);
  logger.info('Documents reloaded and index refreshed.');
}

export async function getChatEngineStatus() {
  if (!chatEngine) {
    logger.warn('Chat engine is not initialized.');
    return 'Chat engine is not initialized.';
  }

  logger.info('Chat engine is running.');
  return 'Chat engine is running.';
}

export async function archiveChats(archivePath: string) {
  const chatsDir = './chats';
  if (!fs.existsSync(chatsDir)) {
    logger.warn(`Chats directory does not exist: ${chatsDir}`);
    return;
  }

  const files = fs.readdirSync(chatsDir);
  if (files.length === 0) {
    logger.info('No chats to archive.');
    return;
  }

  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath, { recursive: true });
  }

  files.forEach((file) => {
    const oldPath = `${chatsDir}/${file}`;
    const newPath = `${archivePath}/${file}`;
    fs.renameSync(oldPath, newPath);
    logger.info(`Archived chat file: ${file}`);
  });

  logger.info('All chats archived successfully.');
}

export async function loadChatHistory(filePath: string): Promise<ChatMessage[]> {
  if (!fs.existsSync(filePath)) {
    logger.warn(`Chat history file does not exist: ${filePath}`);
    return [];
  }

  const chatData = fs.readFileSync(filePath, 'utf-8');
  logger.info(`Loaded chat history from ${filePath}`);
  return JSON.parse(chatData);
}

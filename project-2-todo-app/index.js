import OpenAI from "openai";
import { db } from "./db/index.js";
import { todoTable } from "./db/schema.js";
import readlineSync from "readline-sync";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: OPEN_AI_API_KEY,
});

const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;

const tools = {
  getAllTodos: getAllTodos,
  addNewTodo: addNewTodo,
  searchTodos: searchTodos,
  deleteTodoById: deleteTodoById,
};

// tools
async function getAllTodos() {
  const todos = await db.select(todoTable).all();
  return todos;
}

async function addNewTodo(todo) {
  const [newTodo] = await db
    .insert(todoTable)
    .values(todo)
    .returning(todoTable.id)
    .run();
  return newTodo.id;
}

async function searchTodos(search) {
  const todos = await db
    .select(todoTable)
    .where(todoTable.todo.like(`%${search}%`))
    .all();
  return todos;
}

async function deleteTodoById(id) {
  const todo = await db.delete(todoTable).where(todoTable.id.equals(id)).run();
  return todo;
}

const SYSTEM_PROMPT = `
You are an AI TO-DO List Assistant with START,PLAN,ACTION, OBSERVATION and OUTPUT states
Wait for the user prompt and first PLAN using available tools.
After Planning, Take the action with appropriate tools and wait for Observation based on Action.
Once you get the observations, Return the AI response based on START prompt and observations

You can manage tasks by adding, viewing, searching and deleting tasks.


TODO DB Schema:
CREATE TABLE "todos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "todos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"todo" text NOT NULL,
	"done" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);


Available Tools:
- getAllTodos() - This function returns all the tasks in the TO-DO list.
- addNewTodo(todo: string) - This function adds a new task to the TO-DO list and returns the ID of the new task.
- searchTodos(search: string) - This function searches for tasks in the TO-DO list based on the search string.
- deleteTodoById(id) - This function deletes a task from the TO-DO list by ID.

Example:
START
{ "type": "user", "user": "Add task for shopping groceries" }
{ "type": "plan", "plan": "I will try to get more context from the user on what user needs to shop" }
{ "type": "output", "output": "Can you provide more details on what you need to shop?" }
{ "type": "user", "user": "I need to shop for milk, bread and eggs" }
{ "type": "plan", "plan": "I will add the task to the TO-DO list" }
{ "type": "action", "function": "addNewTodo", "input": "Add task for shopping milk, bread and eggs" }
{ "type": "observation", "observation": "2" }
{ "type": "output", "output": "Your todo has been added with ID 2" }
`;

const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

while (true) {
  const query = readlineSync.question(">>: ");

  const q = {
    role: "user",
    content: query,
  };
  messages.push({ role: "user", content: JSON.stringify(q) });

  while (true) {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      max_tokens: 100,
    });

    const result = chat.choices[0].message.content;
    messages.push({ role: "assistant", content: result });

    const action = JSON.parse(result);
    if (action.type === "output") {
      console.log(result);
      break;
    } else if (action.type === "action") {
      const tool = tools[action.function];
      if (!tool) {
        messages.push({
          role: "assistant",
          content: "I am not sure how to do that",
        });
        break;
      }
      const observation = await tool(action.input);
      const observationMessage = {
        type: "observation",
        observation: observation,
      };
      messages.push({
        role: "developer",
        content: JSON.stringify(observationMessage),
      });
    }
  }
}

import OpenAI from "openai"
import readlineSync from "readline-sync"
import dotenv from "dotenv";
dotenv.config();

// ✅ Create client correctly
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================= TOOLS =================

function getCurrentWeather(city) {
  if (!city) return "Weather data not available";

  const c = city.toLowerCase();

  if (c === "nagpur") return "100C";
  if (c === "bhandara") return "101C";
  if (c === "wardha") return "120C";
  if (c === "gadchiroli") return "111C";

  return "Weather data not available";
}

const tools = {
  getWeatherDetails: getCurrentWeather,
};

// ================= SYSTEM PROMPT =================

const SYSTEM_PROMPT = `you are an Ai assistant with Start,Plan, Action, Observation and Output state.
wait for the user prompt and first plan using available tools.
After planning, take the action with appropriate tool and wait for the observation.
Once you get the observation, return the AI response.

Available tools:
- function getWeatherDetails(city) : String`;

// ================= MEMORY =================

const messages = [{ role: "system", content: SYSTEM_PROMPT }];

// ================= MAIN LOOP =================

while (true) {
  const query = readlineSync.question(">> ");

  const q = {
    type: "user",
    user: query,
  };

  messages.push({ role: "user", content: JSON.stringify(q) });

  // ===== call model =====
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    response_format: { type: "json_object" },
  });

  const result = chat.choices[0].message.content;

  messages.push({ role: "assistant", content: result });

  console.log("\n--------start of AI response--------\n");
  console.log(result);
  console.log("\n--------end of AI response--------\n");

  // ===== safe JSON parse =====
  let call;

  try {
    call = JSON.parse(result);
  } catch (err) {
    console.log("❌ Invalid JSON from model");
    continue;
  }

  // ===== OUTPUT =====
  if (call.type === "output") {
    console.log(":", call.output);
    continue;
  }

  // ===== PLAN =====
  else if (call.type === "plan") {
    continue;
  }

  // ===== ACTION =====
  else if (call.type === "action") {
    const fb = tools[call.action];

    // safety check
    if (!fb) {
      console.log("❌ Unknown tool:", call.action);
      continue;
    }

    const observation = fb(call.input);

    const obs = { type: "observation", observation };

    messages.push({ role: "user", content: JSON.stringify(obs) });
  }
}
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyAdqmXbOHuJuXK_YAEGFJoGTnPhcDd9eG0");
  try {
    // There isn't a direct listModels in the standard SDK easily, 
    // but we can try to see what's wrong with the fetch.
    console.log("Testing API key with a simple call...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("Response:", result.response.text());
  } catch (e) {
    console.error("Error:", e);
  }
}

listModels();

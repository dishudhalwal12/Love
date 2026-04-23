const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI("AIzaSyAdqmXbOHuJuXK_YAEGFJoGTnPhcDd9eG0");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  try {
    const result = await model.generateContent("Hello");
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("Failure:", e.message);
  }
}

test();

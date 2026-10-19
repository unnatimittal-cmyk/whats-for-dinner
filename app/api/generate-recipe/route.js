import { NextResponse } from "next/server";

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

export async function POST(req) {
  try {
    const { ingredients, cuisine, goal, skill } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Please select or type at least one ingredient." },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing. Check your environment variables." },
        { status: 500 }
      );
    }

    const promptText = `
    You are a practical, no-waste home chef.
    User context:
    - Available ingredients: ${ingredients.join(", ")}
    - Preferred Cuisine: ${cuisine || "Any"}
    - Dietary / Calorie Goal: ${goal || "Balanced"}
    - Skill Level: ${skill || "Beginner"}

    Suggest exactly 2 to 3 fast, practical meal ideas using these ingredients.
    Return ONLY a complete, valid JSON object matching this schema without cutting off:
    {
      "recipes": [
        {
          "id": "1",
          "title": "Dish Name",
          "cuisine": "Cuisine category",
          "prepTime": "20 mins",
          "calories": 450,
          "protein": "18g",
          "pantryStaplesNeeded": ["oil", "salt"],
          "instructions": [
            "Step 1: Short action.",
            "Step 2: Short action.",
            "Step 3: Short action."
          ],
          "chefTip": "Short practical tip."
        }
      ]
    }
    Rules:
    - Keep steps and descriptions concise so the JSON response is compact and complete.
    - Keep required extra ingredients to basic pantry staples (salt, oil, water, pepper).
    `;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
              maxOutputTokens: 3000,
            },
          }),
        });

        const resJson = await response.json();

        if (response.ok && resJson?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawOutput = resJson.candidates[0].content.parts[0].text;
          const recipeData = JSON.parse(rawOutput);
          return NextResponse.json(recipeData);
        }

        if (response.status === 503 || response.status === 429) {
          await wait(2000);
          continue;
        }

        lastError = resJson?.error?.message || `HTTP ${response.status}`;
        break;
      } catch (err) {
        lastError = err.message;
        await wait(1000);
      }
    }

    return NextResponse.json(
      { error: `Google API Error: ${lastError || "Could not complete response, please try again."}` },
      { status: 500 }
    );
  } catch (error) {
    console.error("Server Route Error:", error);
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

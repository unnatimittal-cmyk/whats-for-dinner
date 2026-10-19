import { NextResponse } from "next/server";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    Suggest 2 to 3 practical, delicious meal ideas that primarily use these ingredients.
    Return ONLY a valid JSON object matching this schema:
    {
      "recipes": [
        {
          "id": "1",
          "title": "Dish Name",
          "cuisine": "Cuisine category",
          "prepTime": "20 mins",
          "calories": 450,
          "protein": "18g",
          "pantryStaplesNeeded": ["cooking oil", "salt", "black pepper"],
          "instructions": [
            "Step 1 instruction...",
            "Step 2 instruction...",
            "Step 3 instruction..."
          ],
          "chefTip": "A fast practical tip to make it taste great."
        }
      ]
    }
    Rules:
    - Never demand rare, exotic ingredients. Keep extra items to basic pantry staples (salt, water, cooking oil, butter, pepper).
    - Keep steps simple, clear, and beginner-friendly.
    `;

    // Try primary model, retry on 503, then try fallback
    const candidateModels = ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"];
    let lastError = null;

    for (const model of candidateModels) {
      // Allow up to 2 attempts per model to ride out temporary demand spikes
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
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
              },
            }),
          });

          const resJson = await response.json();

          if (response.ok && resJson?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const rawOutput = resJson.candidates[0].content.parts[0].text;
            return NextResponse.json(JSON.parse(rawOutput));
          }

          // If high demand (503 / 429), wait 1.2s before trying again
          if (response.status === 503 || response.status === 429) {
            await sleep(1200);
            continue;
          }

          lastError = resJson?.error?.message || `Model error (${response.status})`;
          break; // Move to the next model if it wasn't a temporary capacity issue
        } catch (err) {
          lastError = err.message;
        }
      }
    }

    return NextResponse.json(
      { error: `Google API Error: ${lastError || "High demand, please tap again in 5 seconds."}` },
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

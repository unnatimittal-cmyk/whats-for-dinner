import { NextResponse } from "next/server";

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

    // Cascade through models: if one is overloaded or unavailable, try the next immediately
    const fallbackModels = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    let lastError = null;

    for (const model of fallbackModels) {
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
          const recipeData = JSON.parse(rawOutput);
          return NextResponse.json(recipeData);
        }

        lastError = resJson?.error?.message || `Model ${model} failed with status ${response.status}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    return NextResponse.json(
      { error: `Google API Error: ${lastError}` },
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

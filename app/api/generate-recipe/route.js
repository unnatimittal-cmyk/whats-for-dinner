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

    const apiKey = (process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Groq API key is missing. Add GROQ_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    const promptText = `
You are a practical, fast home cook.
Ingredients available: ${ingredients.join(", ")}
Preferred Cuisine: ${cuisine || "Any"}
Goal: ${goal || "Quick"}
Skill Level: ${skill || "Beginner"}

Generate exactly 2 to 3 practical, delicious meal ideas using these ingredients.
Return strictly a valid JSON object matching this schema with no markdown or extra text:
{
  "recipes": [
    {
      "id": "1",
      "title": "Dish Name",
      "cuisine": "${cuisine || "Homestyle"}",
      "prepTime": "15 mins",
      "calories": 420,
      "protein": "16g",
      "pantryStaplesNeeded": ["cooking oil", "salt"],
      "instructions": [
        "Step 1: Prep ingredients.",
        "Step 2: Cook in pan over medium heat.",
        "Step 3: Season and serve."
      ],
      "chefTip": "Short practical tip."
    }
  ]
}
`;

    // Standard public models on Groq that never require terms acceptance
    const reliableModels = [
      "gemma2-9b-it",
      "mixtral-8x7b-32768",
      "llama-3.1-8b-instant"
    ];

    let lastError = null;

    for (const model of reliableModels) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: "You are a helpful culinary assistant. Always output strictly valid JSON.",
              },
              { role: "user", content: promptText },
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
          }),
        });

        const resJson = await response.json();

        if (response.ok && resJson?.choices?.[0]?.message?.content) {
          const rawContent = resJson.choices[0].message.content;
          const recipeData = JSON.parse(rawContent);
          return NextResponse.json(recipeData);
        }

        lastError = resJson?.error?.message || `Model ${model} returned HTTP ${response.status}`;
      } catch (err) {
        lastError = err.message;
      }
    }

    return NextResponse.json(
      { error: `Groq Error: ${lastError}` },
      { status: 500 }
    );
  } catch (error) {
    console.error("Groq Route Error:", error);
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

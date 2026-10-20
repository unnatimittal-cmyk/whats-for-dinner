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

    // 1. Fetch the exact list of available models for your Groq account
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const modelsData = await modelsRes.json();
    if (!modelsRes.ok) {
      return NextResponse.json(
        { error: `Groq Auth Error: ${modelsData?.error?.message || "Failed to fetch models"}` },
        { status: 500 }
      );
    }

    // Pick an available text model (look for llama, mixtral, or gemma)
    const availableIds = (modelsData.data || []).map((m) => m.id);
    const chosenModel =
      availableIds.find((id) => id.includes("llama-3") || id.includes("llama3")) ||
      availableIds.find((id) => id.includes("mixtral") || id.includes("gemma")) ||
      availableIds[0];

    if (!chosenModel) {
      return NextResponse.json(
        { error: "No available models found for this Groq account." },
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
Return strictly a valid JSON object matching this schema with no markdown or extra commentary:
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

    // 2. Call the chat completion with the discovered model
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          {
            role: "system",
            content: "You are a precise culinary assistant that outputs valid JSON only.",
          },
          { role: "user", content: promptText },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      }),
    });

    const resJson = await response.json();

    if (!response.ok) {
      const errMsg = resJson?.error?.message || `Groq Error (${chosenModel}): HTTP ${response.status}`;
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const rawContent = resJson.choices?.[0]?.message?.content;
    const recipeData = JSON.parse(rawContent);

    return NextResponse.json(recipeData);
  } catch (error) {
    console.error("Groq Route Error:", error);
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

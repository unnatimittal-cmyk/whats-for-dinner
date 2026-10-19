"use client";

import { useState } from "react";

const STAPLE_INGREDIENTS = [
  "Eggs",
  "Onion",
  "Tomato",
  "Potato",
  "Garlic",
  "Rice",
  "Pasta",
  "Paneer",
  "Chicken",
  "Bread",
  "Yogurt/Curd",
  "Spinach",
  "Cheese",
];

const CUISINES = [
  "Any Cuisine",
  "Indian Homestyle",
  "Italian",
  "Asian / Stir-Fry",
  "Mediterranean",
  "Mexican",
];

const GOALS = [
  "Comfort & Quick (<20m)",
  "Healthy & Balanced",
  "High Protein",
  "Low Calorie (<450 kcal)",
  "One-Pot / Minimal Dishes",
];

export default function Home() {
  const [selectedIngredients, setSelectedIngredients] = useState([
    "Eggs",
    "Tomato",
    "Onion",
  ]);
  const [customInput, setCustomInput] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("Any Cuisine");
  const [selectedGoal, setSelectedGoal] = useState("Comfort & Quick (<20m)");
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [error, setError] = useState("");

  const toggleIngredient = (item) => {
    if (selectedIngredients.includes(item)) {
      setSelectedIngredients(selectedIngredients.filter((i) => i !== item));
    } else {
      setSelectedIngredients([...selectedIngredients, item]);
    }
  };

  const addCustomIngredient = (e) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients([...selectedIngredients, trimmed]);
      setCustomInput("");
    }
  };

  const removeIngredient = (item) => {
    setSelectedIngredients(selectedIngredients.filter((i) => i !== item));
  };

  const handleGenerate = async () => {
    if (selectedIngredients.length === 0) {
      setError("Please select or add at least one ingredient!");
      return;
    }

    setError("");
    setLoading(true);
    setRecipes([]);

    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          cuisine: selectedCuisine,
          goal: selectedGoal,
          skill: "Beginner",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setRecipes(data.recipes || []);
    } catch (err) {
      setError(err.message || "Failed to fetch recipes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#2D2A26] px-4 py-10 sm:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#9C5D35] bg-[#F7EBE1] px-3 py-1 rounded-full">
            No More Takeout Guilt
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 text-[#1E1B18]">
            What’s In Your Kitchen?
          </h1>
          <p className="text-gray-600 mt-2 text-base sm:text-lg">
            Pick your ingredients, set your vibe, and get dinner planned in 10 seconds.
          </p>
        </div>

        {/* Builder Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
          {/* 1. Quick Select Staples */}
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
              1. Tap What You Have
            </label>
            <div className="flex flex-wrap gap-2">
              {STAPLE_INGREDIENTS.map((item) => {
                const isSelected = selectedIngredients.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleIngredient(item)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                      isSelected
                        ? "bg-[#2D2A26] text-white shadow-sm"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {item} {isSelected ? "✓" : "+"}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <form onSubmit={addCustomIngredient} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Have something else? (e.g. Capsicum, Mushroom)"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="flex-1 px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9C5D35]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-medium rounded-lg transition"
              >
                Add
              </button>
            </form>

            {/* Active Items */}
            {selectedIngredients.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-400 mr-1">Selected:</span>
                {selectedIngredients.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center text-xs font-semibold bg-[#F5EFE6] text-[#6E472A] px-2.5 py-1 rounded-md"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeIngredient(item)}
                      className="ml-1.5 text-[#9C5D35] hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <hr className="border-stone-100" />

          {/* 2. Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">
                2. Choose Cuisine
              </label>
              <select
                value={selectedCuisine}
                onChange={(e) => setSelectedCuisine(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#9C5D35]"
              >
                {CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">
                3. Health / Calorie Goal
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#9C5D35]"
              >
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 bg-[#9C5D35] hover:bg-[#854E2C] disabled:bg-stone-300 text-white font-semibold rounded-xl text-base shadow-sm transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Thinking of delicious meals...</span>
            ) : (
              <span>✨ What Can I Cook Tonight?</span>
            )}
          </button>
        </div>

        {/* Results */}
        {recipes.length > 0 && (
          <div className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold text-[#1E1B18]">
              Here are {recipes.length} Meals You Can Make:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recipes.map((recipe, index) => (
                <div
                  key={index}
                  className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-stone-300 transition"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-[#9C5D35] bg-[#F7EBE1] px-2 py-0.5 rounded">
                        {recipe.cuisine}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        ⏱ {recipe.prepTime}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mt-1 mb-2">
                      {recipe.title}
                    </h3>

                    <div className="flex gap-2 text-xs font-semibold text-stone-600 mb-4">
                      <span className="bg-stone-100 px-2 py-1 rounded">
                        🔥 ~{recipe.calories} kcal
                      </span>
                      <span className="bg-stone-100 px-2 py-1 rounded">
                        💪 {recipe.protein} protein
                      </span>
                    </div>

                    {recipe.pantryStaplesNeeded?.length > 0 && (
                      <p className="text-xs text-stone-500 italic mb-4">
                        Pantry items: {recipe.pantryStaplesNeeded.join(", ")}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      <p className="text-xs font-bold uppercase text-stone-400 tracking-wider">
                        Quick Steps:
                      </p>
                      <ol className="text-xs text-stone-700 space-y-1.5 list-decimal list-inside">
                        {recipe.instructions.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {recipe.chefTip && (
                    <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-[#854E2C] bg-[#FAF5F0] p-2.5 rounded-lg">
                      <span className="font-bold">💡 Chef Tip:</span> {recipe.chefTip}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

const userRecipes = [
  {
    name: "Arroz con pollo casero",
    cuisine: "Peruvian",
    description: "Home-style chicken rice with peas, cilantro, and bell pepper.",
    nutritionData: { calories: 680, protein_g: 39, carbs_g: 52, fat_g: 27 },
    servings: 4,
    tags: ["peruvian", "chicken", "rice", "high-protein"],
    ingredients: [
      { canonicalIngredient: "chicken thigh", amount: 800, unit: "g", displayIngredient: "chicken thighs", sortOrder: 0 },
      { canonicalIngredient: "rice", amount: 2, unit: "cup", displayIngredient: "white rice", sortOrder: 1 },
      { canonicalIngredient: "cilantro", amount: 1, unit: "cup", displayIngredient: "cilantro", sortOrder: 2 },
      { canonicalIngredient: "green pea", amount: 1, unit: "cup", displayIngredient: "green peas", sortOrder: 3 },
      { canonicalIngredient: "red bell pepper", amount: 1, unit: "unit", displayIngredient: "red bell pepper", sortOrder: 4 },
      { canonicalIngredient: "chicken stock", amount: 3, unit: "cup", displayIngredient: "chicken stock", sortOrder: 5 },
    ],
    steps: [
      { stepNumber: 1, whatToDo: "Brown the chicken and set aside." },
      { stepNumber: 2, whatToDo: "Blend cilantro with a little stock and cook the mixture briefly." },
      { stepNumber: 3, whatToDo: "Add rice, peas, pepper, and stock, then return the chicken to the pot." },
      { stepNumber: 4, whatToDo: "Cover and cook until the rice is tender." },
    ],
  },
];

module.exports = {
  userRecipes,
};

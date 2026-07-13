// Distinct Dark/Saturated Color Palette
// Curated for maximum contrast and "professional" dark look
export const DISTINCT_COLORS = [
    "#C0392B", // Deep Red
    "#884EA0", // Deep Purple
    "#2471A3", // Strong Blue
    "#17A589", // Teal
    "#229954", // Green
    "#D68910", // Dark Orange
    "#BA4A00", // Burnt Orange
    "#2E4053", // Dark Slate
    "#117864", // Jungle Green
    "#A93226", // Brick Red
    "#8E44AD", // Wisteria Purple (Darker)
    "#2980B9", // Belize Hole Blue
    "#27AE60", // Nephritis Green
    "#F39C12", // Orange
    "#D35400", // Pumpkin
    "#7D3C98", // Plum
    "#2C3E50", // Midnight Blue
    "#1F618D", // Dark Ocean
    "#148F77", // Dark Turquoise
    "#B9770E", // Dark Goldenrod
    "#A04000", // Dark Sienna
    "#6C3483", // Grape
    "#1A5276", // Deep Navy
    "#196F3D", // Dark Emerald
    "#9A7D0A", // Olive
    "#922B21", // Dark Crimson
    "#512E5F", // Dark Violet
    "#154360", // Navy
    "#0E6251", // Dark Teal
    "#0B5345", // Deep Green
    "#7E5109", // Brown
    "#78281F", // Dark Maroon
    "#4A235A", // Deep Purple
    "#1B2631", // Black/Blue
    "#641E16", // Deep Red/Brown
    "#7B241C", // Dark Red
    "#5B2C6F", // Deep Purple
    "#212F3C", // Dark Slate
    "#0E6655", // Deep Teal
    "#186A3B", // Deep Green
    "#9C640C", // Dark Gold
    "#873600", // Dark Orange/Brown
    "#515A5A", // Grey
    "#1C2833", // Dark Grey
    "#F44336", // Red (Material)
    "#E91E63", // Pink (Material)
    "#9C27B0", // Purple (Material)
    "#673AB7", // Deep Purple (Material)
    "#3F51B5", // Indigo (Material)
    "#009688", // Teal (Material)
    "#4CAF50", // Green (Material)
    "#FF9800", // Orange (Material)
    "#FF5722", // Deep Orange (Material)
    "#795548", // Brown (Material)
    "#607D8B"  // Blue Grey (Material)
];

export const getPaletteColor = (index) => {
    return DISTINCT_COLORS[index % DISTINCT_COLORS.length];
};

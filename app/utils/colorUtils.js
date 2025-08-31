/**
 * Convert RGB color object to hex string
 * @param {Object} rgb - Object with red, green, blue properties
 * @returns {string} Hex color string
 */
export function hexFromRgb({ red, green, blue }) {
  if (
    typeof red !== "number" ||
    typeof green !== "number" ||
    typeof blue !== "number"
  ) {
    return "#000000"; // Default value if missing information
  }
  return (
    "#" +
    [red, green, blue]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Convert hex color string to RGB object
 * @param {string} hex - Hex color string
 * @returns {Object} Object with red, green, blue properties
 */
export function hexToRgb(hex) {
  let c = hex.replace(/^#/, "");
  if (c.length === 3)
    c = c
      .split("")
      .map((x) => x + x)
      .join("");
  const num = parseInt(c, 16);
  return {
    red: (num >> 16) & 255,
    green: (num >> 8) & 255,
    blue: num & 255,
  };
}

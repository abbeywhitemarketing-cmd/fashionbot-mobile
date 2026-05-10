export function parseOutfit(text) {
  const result = {
    challenge: null,
    formula: null,
    palette: null,
    primaryLook: null,
    primaryMood: null,
    alternativeLook: null,
    alternativeMood: null,
    eveningShift: null,
    tips: [],
    pinterestUrl: null,
  };

  const urlMatch = text.match(/https:\/\/www\.pinterest\.com\S+/);
  if (urlMatch) result.pinterestUrl = urlMatch[0];

  const lines = text.replace(urlMatch?.[0] || "", "").split("\n").map((l) => l.trim()).filter(Boolean);

  let section = null;
  let lookLines = [];

  for (const line of lines) {
    if (line.startsWith("Style Challenge:")) {
      result.challenge = line.replace("Style Challenge:", "").trim().replace(/^"|"$/g, "");
    } else if (line.startsWith("Formula:")) {
      result.formula = line.replace("Formula:", "").trim();
    } else if (line.startsWith("Palette:")) {
      result.palette = line.replace("Palette:", "").trim().split("·").map((s) => {
        const match = s.trim().match(/^(.*?)\s*(#[0-9A-Fa-f]{6})\s*$/);
        return match ? { name: match[1].trim(), hex: match[2] } : { name: s.trim(), hex: null };
      });
    } else if (line === "Primary Look") {
      if (section === "alt" && lookLines.length) result.alternativeLook = lookLines;
      section = "primary";
      lookLines = [];
    } else if (line === "Alternative Look") {
      if (section === "primary" && lookLines.length) result.primaryLook = lookLines;
      section = "alt";
      lookLines = [];
    } else if (line === "Evening Shift") {
      if (section === "alt" && lookLines.length) result.alternativeLook = lookLines;
      section = "eveningShift";
      lookLines = [];
    } else if (line === "Styling Tips") {
      if (section === "alt" && lookLines.length) result.alternativeLook = lookLines;
      if (section === "eveningShift" && lookLines.length) result.eveningShift = lookLines;
      section = "tips";
      lookLines = [];
    } else if (line === "Mood Board") {
      section = "moodboard";
    } else if (line.startsWith("Mood:")) {
      const mood = line.replace("Mood:", "").trim();
      if (section === "primary") result.primaryMood = mood;
      if (section === "alt") result.alternativeMood = mood;
    } else if (line.startsWith("→") || line.startsWith("->")) {
      result.tips.push(line.replace(/^→|->/, "").trim());
    } else if (section === "primary" || section === "alt" || section === "eveningShift") {
      lookLines.push(line);
    }
  }

  if (section === "alt" && lookLines.length && !result.alternativeLook) {
    result.alternativeLook = lookLines;
  }
  if (section === "eveningShift" && lookLines.length && !result.eveningShift) {
    result.eveningShift = lookLines;
  }

  return result;
}

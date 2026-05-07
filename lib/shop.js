import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://fashionbot-5vcd.onrender.com";
const APP_SECRET = "loOOdEr2eoKmryOIaaBCnYZnNDUqSY_h8h38ncoGPNI";

// Display list — order determines pill order in the sheet
export const RETAILERS = [
  { id: "the-iconic",      name: "The Iconic" },
  { id: "asos",            name: "ASOS" },
  { id: "myer",            name: "Myer" },
  { id: "david-jones",     name: "David Jones" },
  { id: "zara",            name: "Zara" },
  { id: "cos",             name: "COS" },
  { id: "uniqlo",          name: "Uniqlo" },
  { id: "country-road",    name: "Country Road" },
  { id: "witchery",        name: "Witchery" },
  { id: "cue",             name: "Cue" },
  { id: "forever-new",     name: "Forever New" },
  { id: "seed",            name: "Seed Heritage" },
  { id: "kookai",          name: "Kookai" },
  { id: "bec-bridge",      name: "Bec & Bridge" },
  { id: "assembly-label",  name: "Assembly Label" },
  { id: "nude-lucy",       name: "Nude Lucy" },
  { id: "general-pants",   name: "General Pants" },
  { id: "universal-store", name: "Universal Store" },
  { id: "afends",          name: "Afends" },
  { id: "gorman",          name: "Gorman" },
  { id: "vrg-grl",         name: "VRG GRL" },
  { id: "the-fifth-label", name: "The Fifth Label" },
  { id: "sndys",           name: "SNDYS" },
  { id: "nakd",            name: "Na-KD" },
  { id: "ena-pelly",       name: "Ena Pelly" },
  { id: "acler",           name: "Acler" },
  { id: "auguste",         name: "Auguste the Label" },
  { id: "faithfull",       name: "Faithfull the Brand" },
  { id: "bassike",         name: "Bassike" },
  { id: "venroy",          name: "Venroy" },
  { id: "camilla",         name: "Camilla" },
  { id: "elka-collective", name: "Elka Collective" },
  { id: "charcoal",        name: "Charcoal Clothing" },
  { id: "bayse",           name: "Bayse" },
  { id: "double-rainbow",  name: "Double Rainbow" },
  { id: "tree-of-life",    name: "Tree of Life" },
  { id: "oroton",          name: "Oroton" },
  { id: "coach",           name: "Coach" },
  { id: "lovisa",          name: "Lovisa" },
  { id: "billini",         name: "Billini" },
  { id: "latetowork",      name: "Late to Work" },
  { id: "converse",        name: "Converse" },
  { id: "doc-martens",     name: "Dr. Martens" },
  { id: "adidas",          name: "Adidas" },
  { id: "onitsuka-tiger",  name: "Onitsuka Tiger" },
  { id: "nike",            name: "Nike" },
  { id: "fossil",          name: "Fossil" },
  { id: "bared",           name: "Bared Footwear" },
  { id: "jo-mercer",       name: "Jo Mercer" },
  { id: "wittner",         name: "Wittner" },
  { id: "rm-williams",     name: "R.M. Williams" },
  { id: "senso",           name: "Senso" },
  { id: "alias-mae",       name: "Alias Mae" },
  { id: "st-agni",         name: "St. Agni" },
  { id: "status-anxiety",  name: "Status Anxiety" },
  { id: "poppy-lissiman",  name: "Poppy Lissiman" },
  { id: "charlie-middleton", name: "Charlie Middleton" },
];

// Strip parenthetical detail from item names for cleaner search queries
// e.g. "Silk bias-cut midi skirt (ivory, mid-length)" → "Silk bias-cut midi skirt"
export function cleanItemName(item) {
  return item.split("(")[0].trim();
}

export async function shopClick(retailerId, itemName, outfitDate) {
  const response = await fetch(`${BASE_URL}/shop/click`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-secret": APP_SECRET,
    },
    body: JSON.stringify({
      retailer: retailerId,
      item: cleanItemName(itemName),
      outfit_date: outfitDate,
    }),
  });
  if (!response.ok) throw new Error("Shop click failed");
  const { url } = await response.json();
  return url;
}

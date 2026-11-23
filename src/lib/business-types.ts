import type { Lang, Sentiment } from "./store";

/** What changes per kind of business: the options customers tap, what "items" means, and the "when / who with" chips.
 *  `noun` is what gets stored as Business.kind and read by the AI ("my experience at a clothing store"). */
export type BusinessType = {
  key: string;
  label: string; // shown in the Type dropdown
  noun: string;
  items: { title: string; question: string; placeholder: string; aiLabel: string };
  had: Record<Lang, (list: string) => string>; // template-draft sentence about the chosen items
  occasions: string[];
  photo: { label: string; things: string } | null; // null = no photo (e.g. clinics: medical photos are private)
  highlights: Record<Sentiment, string[]>;
};

const bought: BusinessType["had"] = { en: (l) => `I bought the ${l}`, roman: (l) => `Maine ${l} liya`, ur: (l) => `میں نے ${l} خریدا` };

export const BUSINESS_TYPES: BusinessType[] = [
  {
    key: "restaurant",
    label: "Café / Restaurant",
    noun: "café",
    items: { title: "Menu", question: "Anything you had?", placeholder: "Doodh patti\nBun kebab", aiLabel: "What I had" },
    had: { en: (l) => `I had the ${l}`, roman: (l) => `Maine ${l} liya`, ur: (l) => `میں نے ${l} لیا` },
    occasions: ["Breakfast", "Lunch", "Dinner", "Evening chai", "With family", "With friends", "Date", "Work meeting", "Takeaway"],
    photo: { label: "Add a photo of your food", things: "food and drinks" },
    highlights: {
      positive: ["Food was tasty", "Friendly staff", "Quick service", "Clean place", "Good value for money", "Nice atmosphere"],
      neutral: ["Food was fine", "Service was okay", "A bit crowded", "Average prices"],
      negative: ["Food arrived cold", "Long wait", "Order was wrong", "Too pricey", "Place wasn't clean"],
    },
  },
  {
    key: "clothing",
    label: "Clothing / Fashion store",
    noun: "clothing store",
    items: { title: "Products", question: "What did you buy?", placeholder: "Lawn suit\nKurta", aiLabel: "What I bought" },
    had: bought,
    occasions: ["Eid shopping", "Wedding shopping", "Everyday wear", "Gift", "With family", "With friends", "Order pickup"],
    photo: { label: "Add a photo of what you bought", things: "clothes, shoes or accessories" },
    highlights: {
      positive: ["Good quality fabric", "Nice designs", "Helpful staff", "Fair prices", "Easy to find my size", "Clean, organised store"],
      neutral: ["Average quality", "Prices were okay", "Limited sizes", "Service was okay"],
      negative: ["Poor stitching or quality", "My size wasn't available", "Too pricey", "Unhelpful staff", "Long queue at billing", "Exchange was difficult"],
    },
  },
  {
    key: "school",
    label: "School / Academy",
    noun: "school",
    items: { title: "Classes / programs", question: "Which class or program?", placeholder: "Grade 5\nO Levels", aiLabel: "Class or program" },
    had: { en: (l) => `This is about ${l}`, roman: (l) => `Ye ${l} ke baare mein hai`, ur: (l) => `یہ ${l} کے بارے میں ہے` },
    occasions: ["As a parent", "As a student", "Admission visit", "Parent-teacher meeting", "Result day", "School event"],
    photo: null,
    highlights: {
      positive: ["Caring teachers", "Good teaching quality", "Clean campus", "Safe environment", "Good communication with parents", "Helpful admin staff"],
      neutral: ["Fees are average", "Facilities are okay", "Communication could be better", "Average results"],
      negative: ["High fees", "Poor communication", "Overcrowded classes", "Unhelpful admin", "Transport issues", "Not enough activities"],
    },
  },
  {
    key: "salon",
    label: "Salon / Beauty / Spa",
    noun: "salon",
    items: { title: "Services", question: "What did you get done?", placeholder: "Haircut\nFacial", aiLabel: "Service I got" },
    had: { en: (l) => `I got the ${l}`, roman: (l) => `Maine ${l} karwaya`, ur: (l) => `میں نے ${l} کروایا` },
    occasions: ["Wedding / bridal", "Party", "Regular visit", "First visit", "With friends", "Walk-in"],
    photo: { label: "Add a photo of the result", things: "the hair, makeup or nail result" },
    highlights: {
      positive: ["Skilled stylist", "Clean and hygienic", "On time", "Friendly staff", "Good value", "Relaxing atmosphere"],
      neutral: ["Service was okay", "Had to wait a bit", "Average prices", "Result was fine"],
      negative: ["Long wait", "Not hygienic", "Result wasn't what I asked for", "Too pricey", "Rushed service", "Rude staff"],
    },
  },
  {
    key: "clinic",
    label: "Clinic / Hospital / Lab",
    noun: "clinic",
    items: { title: "Services / departments", question: "What did you visit for?", placeholder: "General checkup\nDental", aiLabel: "Visited for" },
    had: { en: (l) => `I came for ${l}`, roman: (l) => `Main ${l} ke liye aaya`, ur: (l) => `میں ${l} کے لیے آیا` },
    occasions: ["Checkup", "Follow-up", "Emergency", "Test / lab work", "With family", "Child's visit"],
    photo: null,
    highlights: {
      positive: ["Caring doctor", "Explained things clearly", "Short wait", "Clean clinic", "Friendly staff", "Fair fees"],
      neutral: ["Wait was okay", "Average fees", "Doctor was fine", "Staff were okay"],
      negative: ["Long wait", "Doctor rushed", "High fees", "Not clean", "Rude staff", "Hard to get an appointment"],
    },
  },
  {
    key: "hotel",
    label: "Hotel / Guest house",
    noun: "hotel",
    items: { title: "Rooms / services", question: "What did you book?", placeholder: "Deluxe room\nRestaurant", aiLabel: "What I booked" },
    had: { en: (l) => `I booked the ${l}`, roman: (l) => `Maine ${l} book kiya`, ur: (l) => `میں نے ${l} بک کیا` },
    occasions: ["Family trip", "Business trip", "Honeymoon", "With friends", "Wedding / event", "One night stay"],
    photo: { label: "Add a photo of your room", things: "the room or hotel" },
    highlights: {
      positive: ["Clean room", "Friendly staff", "Comfortable bed", "Good breakfast", "Great location", "Quick check-in"],
      neutral: ["Room was okay", "Average prices", "Breakfast was fine", "Some noise"],
      negative: ["Room wasn't clean", "Slow check-in", "Noisy", "Too pricey", "AC or heating problem", "Unhelpful staff"],
    },
  },
  {
    key: "shop",
    label: "Shop / Store / Market",
    noun: "shop",
    items: { title: "Products", question: "What did you buy?", placeholder: "Mobile phone\nGroceries", aiLabel: "What I bought" },
    had: bought,
    occasions: ["Monthly shopping", "Quick visit", "Gift", "With family", "Order pickup", "Home delivery"],
    photo: { label: "Add a photo of what you bought", things: "the products" },
    highlights: {
      positive: ["Good quality products", "Fair prices", "Helpful staff", "Good variety", "Quick billing", "Clean store"],
      neutral: ["Prices were okay", "Average variety", "Service was okay", "A bit crowded"],
      negative: ["Item out of stock", "Too pricey", "Unhelpful staff", "Long billing queue", "Wrong or damaged item", "Difficult returns"],
    },
  },
  {
    key: "service",
    label: "Other service",
    noun: "business",
    items: { title: "Services", question: "Which service?", placeholder: "Car service\nRepair", aiLabel: "Service I used" },
    had: { en: (l) => `I used the ${l}`, roman: (l) => `Maine ${l} li`, ur: (l) => `میں نے ${l} لی` },
    occasions: ["First visit", "Regular customer", "Urgent need", "Appointment", "Walk-in", "With family"],
    photo: { label: "Add a photo of the work", things: "the work or result" },
    highlights: {
      positive: ["Professional service", "On time", "Friendly staff", "Good value", "Clear communication", "Problem solved"],
      neutral: ["Service was okay", "Average prices", "Took a while", "Communication was okay"],
      negative: ["Long wait", "Too pricey", "Poor communication", "Problem not solved", "Unprofessional", "Rude staff"],
    },
  },
];

// Businesses made before types existed store free text such as "café" or "restaurant".
const ALIASES: Record<string, string> = { cafe: "restaurant", café: "restaurant", restaurant: "restaurant", dhaba: "restaurant", bakery: "restaurant" };

/** The preset for a stored kind (the type's noun, its key, or an older free-text kind). Unknown kinds get "Other service". */
export function typeOf(kind: string | null | undefined): BusinessType {
  const k = (kind ?? "").trim().toLowerCase();
  return (
    BUSINESS_TYPES.find((t) => t.noun === k || t.key === k || t.label.toLowerCase() === k) ??
    BUSINESS_TYPES.find((t) => t.key === ALIASES[k]) ??
    BUSINESS_TYPES.find((t) => t.key === "service")!
  );
}

/** What to save as a business's type: a known type's noun, or for "Other service" the owner's own words
 *  (e.g. "gym", "car wash"), cleaned and short because they go into the review prompt. */
export function normalizeKind(kind: string): string {
  const t = typeOf(kind);
  if (t.key !== "service") return t.noun;
  const own = kind.replace(/[^\p{L}\p{N} &'\-/]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40).toLowerCase();
  return own && own !== t.label.toLowerCase() && own !== t.key ? own : t.noun;
}

/** True when a saved type is "Other service" (a preset noun or the owner's own words). */
export const isOtherKind = (kind: string | null | undefined) => typeOf(kind).key === "service";

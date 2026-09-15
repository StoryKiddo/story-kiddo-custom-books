/** Simple four-panel explainer of the current product flow. */
const STEPS = [
  {
    n: "1",
    title: "Choose a theme",
    body: "Pick the lesson you want the story to carry — letters, numbers, feelings, first days, and more.",
  },
  {
    n: "2",
    title: "Add a photo",
    body: "Upload a picture of your child so the illustrations can look like them.",
  },
  {
    n: "3",
    title: "Tell us their name & age",
    body: "We write the story around who they are right now.",
  },
  {
    n: "4",
    title: "Get their book",
    body: "A personalized illustrated storybook — generation comes next; the order is saved today.",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step) => (
        <li
          key={step.n}
          className="paper-grain relative overflow-hidden rounded-[26px] bg-cream/85 p-6 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_0_0_1px_rgba(196,160,106,0.35),0_14px_26px_-20px_rgba(36,28,22,0.4)] sm:p-7"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-coral/12 font-cover text-xl font-bold text-coral-dark">
            {step.n}
          </span>
          <h3 className="mt-4 font-cover text-lg font-bold text-ink">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

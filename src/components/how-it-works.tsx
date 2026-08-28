/** Simple four-panel explainer of the current product flow. */
const STEPS = [
  {
    n: "1",
    title: "Choose a track",
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
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step) => (
        <li
          key={step.n}
          className="rounded-3xl border border-rule bg-white/70 p-5 shadow-[2px_2px_0_0_rgba(43,36,28,0.06)]"
        >
          <span className="font-display text-3xl text-coral">{step.n}</span>
          <h3 className="mt-2 text-lg text-ink">{step.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

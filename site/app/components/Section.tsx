export function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="container px-4 pb-20">
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

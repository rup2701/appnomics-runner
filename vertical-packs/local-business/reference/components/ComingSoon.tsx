/** A large labelled block for a section that has no content yet (template mode only). It says what is missing and never pretends to be real content. */
export function ComingSoon({ id, title, text, alt = false }: { id: string; title: string; text: string; alt?: boolean }) {
  return (
    <section className={alt ? "rb-sec alt" : "rb-sec"} id={id}>
      <div className="rb-container">
        <h2 className="rb-title">{title}</h2>
        <div className="rb-soon"><p>{text}</p></div>
      </div>
    </section>
  );
}

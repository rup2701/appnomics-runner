import { footerColumns, type Content } from "../lib/content";

/** FooterRestaurant01: Contact, Hours and Follow columns on a light surface. A column with nothing in it is not drawn. */
export function Footer({ c, year }: { c: Content; year: number }) {
  return (
    <footer className="rb-foot" id="contact">
      <div className="rb-container">
        <div className="rb-foot-cols">
          {footerColumns(c).map((col) => (
            <div key={col.title}>
              <h3>{col.title}</h3>
              {col.lines.map((l) => (l.href ? <a key={l.text} href={l.href} {...(l.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{l.text}</a> : <p key={l.text}>{l.text}</p>))}
            </div>
          ))}
        </div>
        <div className="rb-foot-bottom"><p>© {year} {c.name}</p></div>
      </div>
    </footer>
  );
}

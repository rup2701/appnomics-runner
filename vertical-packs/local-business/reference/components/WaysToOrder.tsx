import { waysToOrder, type Content } from "../lib/content";
import { Icon } from "./Icon";

/** ActionCards01: one card per real way to reach the restaurant. The page only draws this when there are at least two. */
export function WaysToOrder({ c }: { c: Content }) {
  const ways = waysToOrder(c);
  return (
    <section className="rb-sec" id="ways">
      <div className="rb-container">
        <h2 className="rb-title">Ways to enjoy us</h2>
        <div className="rb-ways">
          {ways.map((w) => (
            <div className="rb-way" key={w.id}>
              <Icon name={w.id} />
              <h3>{w.title}</h3>
              <p>{w.text}</p>
              <a className="rb-btn ghost" href={w.href} {...(w.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{w.cta}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

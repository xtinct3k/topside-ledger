import { GLYPHS, type IconName } from "../icons";

export function Icon({ name }: { name: IconName }) {
  return <svg className="g" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLYPHS[name] }} />;
}

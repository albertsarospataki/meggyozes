/**
 * A Vonás — a Convictly jele (brandbook 4.1).
 *
 * Körív 100-as rácson, r = 31, 13,5 egység vastag vonal lekerekített véggel,
 * 106°-os nyílással jobbra; az alsó ívvég egyenesen folytatódik a pipa szárába
 * (90,5 ; 29,5). Egy vonal, nem két elem: nem szedjük szét, nem színezzük kétfelé,
 * nem forgatjuk. A szín `currentColor`, hogy a kontextus adja — a jel sosem kap
 * szemantikus színt (12.1).
 */
export function Vonas({ meret = 24 }: { readonly meret?: number }) {
  return (
    <svg
      width={meret}
      height={meret}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M69.9 26.3 A31 31 0 1 0 67.3 75.7 L90.5 29.5"
        stroke="currentColor"
        strokeWidth="13.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

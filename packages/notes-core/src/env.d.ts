/**
 * Ambient type for the build-time numbering map provided by the `numbering`
 * integration (see numbering.ts). Consumed by the numbered block components and
 * <Ref>.
 */
declare module 'virtual:numbering' {
  interface NumberEntry {
    number: string;
    label: string;
    url: string;
    type: 'Callout' | 'Algorithm' | 'Listing';
  }
  const map: { byId: Record<string, NumberEntry> };
  export default map;
}

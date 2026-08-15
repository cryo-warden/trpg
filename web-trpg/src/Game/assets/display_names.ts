/** The last step of the id -> raw-name -> human trip: the asset tables
 * carry the raw key back from an id; an authored vocabulary record turns
 * it into what a person reads. A pushed asset the client vocabulary lacks
 * keeps its raw key visible — drift should be seen, never hidden behind a
 * guessed prettification. */
export const displayNameFrom = (
  vocabulary: Record<string, string>,
  rawName: string,
): string => vocabulary[rawName] ?? rawName;

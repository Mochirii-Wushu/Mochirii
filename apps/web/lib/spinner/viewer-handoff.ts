export type LiveDrawHandoffIntent = {
  requested: boolean;
  hadParameter: boolean;
  cleanedLocation: string;
};

export function consumeLiveDrawHandoffIntent(currentLocation: string): LiveDrawHandoffIntent {
  const url = new URL(currentLocation);
  const values = url.searchParams.getAll("open");
  const requested = values.length === 1 && values[0] === "live-draw";
  const hadParameter = values.length > 0;

  if (hadParameter) url.searchParams.delete("open");

  return {
    requested,
    hadParameter,
    cleanedLocation: `${url.pathname}${url.search}${url.hash}`,
  };
}

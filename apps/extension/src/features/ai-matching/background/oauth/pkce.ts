import { calculatePKCECodeChallenge, generateRandomCodeVerifier } from "oauth4webapi";

export interface Pkce {
  codeVerifier: string;
  codeChallenge: string;
}

export async function createPkce(): Promise<Pkce> {
  const codeVerifier = generateRandomCodeVerifier();
  return { codeVerifier, codeChallenge: await calculatePKCECodeChallenge(codeVerifier) };
}

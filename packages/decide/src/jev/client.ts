import {
  choice,
  noul,
  type Questions,
  type RequestOptions,
  type SystemOneRequest,
  type SystemOneResult,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import { OPENROUTER_BASE_URL } from "./config";

/** Question builders and wire types of the SDK; the rest of the package reaches the SDK only through here. */
export { choice as choiceQuestion, noul as noulQuestion, type Questions, type RequestOptions };

/** The one method of `TypeSafeClient` this package uses; tests inject a fake that records requests. */
export interface SystemOneClient {
  systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>,
    options?: RequestOptions,
  ): PromiseLike<SystemOneResult<Q>>;
}

/** The slice of `JevDeciderOptions` that configures the SDK client. */
export interface DefaultClientOptions {
  readonly apiKey?: string | undefined;
  readonly baseURL?: string | undefined;
  readonly dangerouslyAllowBrowser?: boolean | undefined;
}

export function defaultClient(options: DefaultClientOptions, model: string): SystemOneClient {
  // The SDK would silently fall back to the TYPESAFE_API_KEY environment variable; the key must be explicit.
  if (options.apiKey === undefined || options.apiKey.trim() === "") {
    throw new TypeError("createJevDecider needs an apiKey (OpenRouter) or a client");
  }
  return new TypeSafeClient({
    apiKey: options.apiKey,
    baseURL: options.baseURL ?? OPENROUTER_BASE_URL,
    defaultModel: model,
    ...(options.dangerouslyAllowBrowser === undefined
      ? {}
      : { dangerouslyAllowBrowser: options.dangerouslyAllowBrowser }),
  });
}

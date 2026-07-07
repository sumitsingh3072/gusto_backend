/**
 * Deliberately does NOT accept a codeVerifier from the caller -- PKCE's
 * security model requires the verifier to stay server-side, looked up by
 * `state` from the PendingAuthSession this service created in
 * startPkceFlow(). Accepting a client-supplied verifier here would let any
 * caller redeem someone else's authorization code.
 */
export class LoginCallbackDto {
  code!: string;
  state!: string;
}

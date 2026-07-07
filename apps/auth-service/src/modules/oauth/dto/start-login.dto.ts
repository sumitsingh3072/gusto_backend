/**
 * userId identifies an existing (or about-to-exist) Gusto user. Creating
 * that identity (e.g. via phone-number signup) happens upstream of this
 * service; exchangeCodeForToken() upserts the User row, so this works
 * whether or not a row already exists yet.
 */
export class StartLoginDto {
  userId!: string;
}

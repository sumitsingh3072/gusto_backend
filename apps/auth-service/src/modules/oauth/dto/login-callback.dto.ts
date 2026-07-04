export class LoginCallbackDto {
  code!: string;
  codeVerifier!: string;
  state!: string;
}

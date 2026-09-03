import 'passport-google-oauth20';

declare module 'passport-google-oauth20' {
  interface AuthenticateOptionsGoogle {
    callbackURL?: string;
  }
}

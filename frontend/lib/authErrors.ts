/** True when the user simply closed/cancelled the Google popup - not worth showing an error. */
export const isPopupDismissed = (err: unknown) => {
  const code = (err as { code?: string })?.code;
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
};

/** Maps Firebase Auth error codes to friendly messages without leaking whether an account exists. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 8 characters).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been deactivated. Contact an administrator.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this project yet. Ask an administrator to enable it in Firebase.';
    case 'auth/unauthorized-domain':
      return 'This website address is not authorised for Google sign-in. Add it under Firebase -> Authentication -> Settings -> Authorized domains.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists using a different sign-in method. Sign in with your password instead.';
    default:
      return (err as Error)?.message || 'Something went wrong. Please try again.';
  }
}

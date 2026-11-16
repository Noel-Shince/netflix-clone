/**
 * Sign-in / sign-up form.
 *
 * Presentational: owns field state and mode switching, and hands a typed
 * `LoginFormValues` to `onSubmit`. It knows nothing about Firebase, so slice 05
 * only changes the handler passed in by LoginPage.
 */
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { AuthMode, LoginFormValues } from '../../types.ts';
import './LoginForm.css';

/** Firebase Auth rejects passwords shorter than this. */
const MIN_PASSWORD_LENGTH = 6;

const COPY: Record<
  AuthMode,
  { heading: string; submit: string; switchPrompt: string; switchAction: string }
> = {
  signIn: {
    heading: 'Sign In',
    submit: 'Sign In',
    switchPrompt: 'New to Netflix?',
    switchAction: 'Sign up now',
  },
  signUp: {
    heading: 'Sign Up',
    submit: 'Sign Up',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in now',
  },
};

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => void;
  /** Optional message shown under the button (e.g. the slice-02 placeholder notice). */
  notice?: string | null;
}

export function LoginForm({ onSubmit, notice }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const formRef = useRef<HTMLFormElement>(null);
  const ids = { name: useId(), email: useId(), password: useId(), remember: useId() };
  const copy = COPY[mode];
  const isSignUp = mode === 'signUp';

  function switchMode() {
    setMode(isSignUp ? 'signIn' : 'signUp');
    // Focus the first field once the new mode has rendered, so keyboard users
    // are not left on a button that just changed its meaning.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Native constraint validation has already run; the browser blocks
    // submission and shows its own hint if a field is invalid.
    event.preventDefault();
    onSubmit({
      mode,
      name: isSignUp ? name.trim() : '',
      email: email.trim(),
      password,
      rememberMe,
    });
  }

  const bind = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) =>
    setter(event.target.value);

  return (
    <section className="login-form" aria-labelledby="login-form-heading">
      <h1 id="login-form-heading" className="login-form__heading">
        {copy.heading}
      </h1>

      <form ref={formRef} className="login-form__form" onSubmit={handleSubmit}>
        {isSignUp && (
          <div className="login-form__field">
            <input
              id={ids.name}
              className="login-form__input"
              type="text"
              autoComplete="name"
              placeholder=" "
              required
              value={name}
              onChange={bind(setName)}
            />
            <label htmlFor={ids.name} className="login-form__label">
              Your name
            </label>
          </div>
        )}

        <div className="login-form__field">
          <input
            id={ids.email}
            className="login-form__input"
            type="email"
            autoComplete="email"
            placeholder=" "
            required
            value={email}
            onChange={bind(setEmail)}
          />
          <label htmlFor={ids.email} className="login-form__label">
            Email address
          </label>
        </div>

        <div className="login-form__field">
          <input
            id={ids.password}
            className="login-form__input"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            placeholder=" "
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={bind(setPassword)}
          />
          <label htmlFor={ids.password} className="login-form__label">
            Password
          </label>
        </div>

        <button type="submit" className="login-form__submit">
          {copy.submit}
        </button>

        {notice && (
          <p className="login-form__notice" role="status">
            {notice}
          </p>
        )}

        <div className="login-form__help">
          <label htmlFor={ids.remember} className="login-form__remember">
            <input
              id={ids.remember}
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Remember me
          </label>
          {/* Password reset is out of scope for v1 (PRD §4). */}
          <span className="login-form__need-help">Need help?</span>
        </div>
      </form>

      <p className="login-form__switch">
        {copy.switchPrompt}{' '}
        <button type="button" className="login-form__switch-button" onClick={switchMode}>
          {copy.switchAction}
        </button>
        .
      </p>
    </section>
  );
}

import { useState } from "react";
import { Panel } from "../structural/Panel";
import { useMyLoginRequest } from "./context/StdbContext/account";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * The unattached-identity screen: this connection owns nothing until it
 * either creates a new account or is confirmed onto an existing one by that
 * account's previously attached devices. Both input sets are offered, per the
 * no-implicit-accounts rule.
 */
/** A short human-relayable code, shown only on this (requesting) device. */
const newVerificationCode = (): string => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] % 1000000).toString().padStart(6, "0");
};

export const AccountPanel = () => {
  const connection = useStdbConnection();
  const request = useMyLoginRequest();
  const [newAccountName, setNewAccountName] = useState("");
  const [loginAccountName, setLoginAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (action: Promise<void>) => {
    setError(null);
    action.catch((reason) => setError(String(reason)));
  };

  const requestLogin = () => {
    const code = newVerificationCode();
    setVerificationCode(code);
    run(
      connection.reducers.requestLogin({
        accountName: loginAccountName,
        verificationCode: code,
      }),
    );
  };

  return (
    <Panel className="account">
      <h2>Account</h2>
      {error != null && <div className="error">{error}</div>}
      <section>
        <h3>New account</h3>
        <input
          aria-label="new account name"
          value={newAccountName}
          onChange={(event) => setNewAccountName(event.target.value)}
        />
        <button
          onClick={() =>
            run(connection.reducers.createAccount({ name: newAccountName }))
          }
        >
          Create account
        </button>
      </section>
      <section>
        <h3>Log in</h3>
        <input
          aria-label="login account name"
          value={loginAccountName}
          onChange={(event) => setLoginAccountName(event.target.value)}
        />
        <button onClick={requestLogin}>Request login</button>
        <input
          aria-label="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          onClick={() =>
            run(
              connection.reducers.loginWithPassword({
                accountName: loginAccountName,
                password,
              }),
            )
          }
        >
          Log in with password
        </button>
        {verificationCode != null && (
          <div className="verification-code">
            Verification code: <strong>{verificationCode}</strong> — read this
            to your already-logged-in device; approving requires it.
          </div>
        )}
        {request != null && (
          <div className="login-request-status">
            {request.status.tag === "Pending"
              ? "Waiting for your other devices to confirm this login…"
              : request.status.tag === "Refused"
                ? "A previously connected device refused this login."
                : "Login accepted."}
          </div>
        )}
      </section>
    </Panel>
  );
};

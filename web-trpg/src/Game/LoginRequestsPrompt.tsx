import { useState } from "react";
import { usePendingLoginRequests } from "./context/StdbContext/account";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * Shown on every ALREADY-attached device when a new connection asks to join
 * the account. Visibility of these requests is the security model: a login
 * can only complete in front of the devices that already hold the account,
 * and any explicit refusal kills it. Accepting requires typing the
 * verification code shown on the requesting device's screen — proof of
 * coordination, not a blind click. Refusing never needs a code.
 */
const LoginRequestRow = ({ requestId }: { requestId: bigint }) => {
  const connection = useStdbConnection();
  const [verificationCode, setVerificationCode] = useState("");

  return (
    <div className="login-request">
      <span>
        A new connection asks to join this account. Enter the code from its
        screen to accept; refuse if it is not yours.
      </span>
      <input
        aria-label="verification code"
        value={verificationCode}
        onChange={(event) => setVerificationCode(event.target.value)}
      />
      <button
        onClick={() =>
          connection.reducers.acceptLoginRequest({
            loginRequestId: requestId,
            verificationCode,
          })
        }
      >
        Accept
      </button>
      <button
        onClick={() =>
          connection.reducers.refuseLoginRequest({
            loginRequestId: requestId,
          })
        }
      >
        Refuse
      </button>
    </div>
  );
};

export const LoginRequestsPrompt = () => {
  const requests = usePendingLoginRequests();

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="login-requests-prompt">
      {requests.map((request) => (
        <LoginRequestRow key={request.id.toString()} requestId={request.id} />
      ))}
    </div>
  );
};

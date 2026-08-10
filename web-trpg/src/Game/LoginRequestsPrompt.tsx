import { usePendingLoginRequests } from "./context/StdbContext/account";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * Shown on every ALREADY-attached device when a new connection asks to join
 * the account. Visibility of these requests is the security model: a login
 * can only complete in front of the devices that already hold the account,
 * and any explicit refusal kills it.
 */
export const LoginRequestsPrompt = () => {
  const connection = useStdbConnection();
  const requests = usePendingLoginRequests();

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="login-requests-prompt">
      {requests.map((request) => (
        <div key={request.id.toString()} className="login-request">
          <span>
            A new connection asks to join this account. Only accept if it is
            yours.
          </span>
          <button
            onClick={() =>
              connection.reducers.respondLogin({
                loginRequestId: request.id,
                accept: true,
              })
            }
          >
            Accept
          </button>
          <button
            onClick={() =>
              connection.reducers.respondLogin({
                loginRequestId: request.id,
                accept: false,
              })
            }
          >
            Refuse
          </button>
        </div>
      ))}
    </div>
  );
};

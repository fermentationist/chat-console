import "dotenv/config";
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === "true";
const WAKE_SERVER_URL = process.env.WAKE_SERVER_URL;

export const cLog = (message, logLevel) => {
  if (logLevel === "verbose") {
    if (VERBOSE_LOGS) {
      console.log(message);
    }
  } else {
    console.log(message);
  }
};

export const wakeServer = () => {
  console.log("waking http server...");
  return WAKE_SERVER_URL ? fetch(WAKE_SERVER_URL).catch((err) => {
    // do nothing if fetch fails
  }) : null;
};

export class CancellablePromise extends Promise {
  constructor(executor) {
    let tempResolve, tempReject;
    super((resolve, reject) => {
      tempResolve = resolve;
      tempReject = reject;
      return executor(resolve, reject);
    });
    this.resolve = tempResolve.bind(this);
    this.reject = tempReject.bind(this);
    this.fulfill = this.fulfill.bind(this);
    this.cancel = this.cancel.bind(this);
    return this;
  }

  fulfill(value) {
    console.log("fulfilling promise:", value);
    return this.resolve(value);
  }

  cancel(reason = "cancelled") {
    console.log("cancelling promise...");
    return this.reject(reason);
  }
}
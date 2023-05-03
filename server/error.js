class CustomError extends Error {
  constructor(name, message, data = {}) {
    super(message);
    this.name = name;
    this.data = data;
  }
}

export default (name, message, data) => {
  return new CustomError(name, message, data);
}

export const ENUMERATED_ERRORS = ["invalid_handle", "invalid_command", "invalid_recipient", "invalid_message"];
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


export const bindCommandToGetter = (func, aliasArray) => {
  aliasArray.forEach((alias) => {
    Object.defineProperty(window, alias, { get: func });
  });
};

export const getCases = string => {
  return [string, string.toLowerCase(), string.toUpperCase(), string[0].toUpperCase() + string.slice(1)];
}

export const bindFunctionToWindow = (func, aliasArray) => {
  aliasArray.forEach((alias) => {
    window[alias] = func;
  });
}

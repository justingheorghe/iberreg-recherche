const levels = ["debug", "info", "warn", "error"];

function write(level, message, context = {}) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...context
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = Object.fromEntries(levels.map((level) => [level, (message, context) => write(level, message, context)]));

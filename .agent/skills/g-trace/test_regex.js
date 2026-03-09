const SECRET_REGEX = /(?:api[_-]?key|token|secret)["']?\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi;

const text1 = "{\n  \"api_key\": \"sk-abcdefghijklmnopqrstuvwxyz123456\",\n  \"auth_token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\"\n}";
const text2 = "api_key=sk-abcdefghijklmnopqrstuvwxyz123456";

console.log("Text1 replacement:");
console.log(text1.replace(SECRET_REGEX, (match, p1) => match.replace(p1, '[REDACTED_SECRET]')));

console.log("Text2 replacement:");
console.log(text2.replace(SECRET_REGEX, (match, p1) => match.replace(p1, '[REDACTED_SECRET]')));

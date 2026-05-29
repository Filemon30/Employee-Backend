export const generateRandomId = (): string => {
  let randomNumber = "";

  for (let i = 0; i < 8; i++) {
    randomNumber += Math.floor(Math.random() * 10); // 0–9
  }

  return randomNumber; // 8-digit string
};
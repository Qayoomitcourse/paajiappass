// src/utils/passUtils.ts

export const generatePassId = (): string => {
    const year = new Date().getFullYear();
    const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
    return `${year}-${randomNumber}`;
  };
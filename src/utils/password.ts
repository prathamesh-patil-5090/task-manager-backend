;`This file is to compare, encode and validate the password`
import bcrypt from "bcrypt"
import env from "../../env"

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, env.BCRYPT_ROUNDS)
}

const comparePassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashPassword)
}

const validatePassword = (
  password: string,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password cannot be of less than 8 characters")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain a Uppercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain a number")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain a Lowercase letter")
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain a special character")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export { comparePassword, hashPassword, validatePassword }

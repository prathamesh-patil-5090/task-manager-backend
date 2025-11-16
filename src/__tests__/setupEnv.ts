import { jest } from "@jest/globals"

process.env.JWT_SECRET = "12345678901234567890123456789012" // 32 chars
process.env.JWT_REFRESH_SECRET = "abcdefghijklmnopqrstuvwxyzABCDEF" // 32 chars
process.env.APP_STAGE = "test"
process.env.DATABASE_URL = "mongodb://localhost:27017/test"
process.env.BCRYPT_ROUNDS = "10"

jest.setTimeout(15000)

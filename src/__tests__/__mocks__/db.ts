import type { PrismaClient } from "@prisma/client"
import { mockDeep, mockReset } from "jest-mock-extended"

export const prismaMock = mockDeep<PrismaClient>()

// PrismaClient constructor mock (so prisma = new PrismaClient() returns the mock)
jest.mock("../../db", () => ({
  __esModule: true,
  default: prismaMock,
}))

beforeEach(() => {
  mockReset(prismaMock)
})

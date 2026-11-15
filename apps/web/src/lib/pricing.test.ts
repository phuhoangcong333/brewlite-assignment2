import { describe, expect, it } from "vitest";
import { calculateUnitPrice } from "./pricing";

describe("calculateUnitPrice", () => {
  it("trả giá gốc khi không có phụ thu size và topping", () => {
    expect(calculateUnitPrice(30000, 0, [])).toBe(30000);
  });

  it("cộng phụ thu của size", () => {
    expect(calculateUnitPrice(30000, 5000, [])).toBe(35000);
  });

  it("cộng giá của một topping", () => {
    expect(
      calculateUnitPrice(30000, 0, [
        { additionalPrice: 5000 },
      ]),
    ).toBe(35000);
  });

  it("cộng giá size và nhiều topping", () => {
    expect(
      calculateUnitPrice(30000, 10000, [
        { additionalPrice: 5000 },
        { additionalPrice: 7000 },
      ]),
    ).toBe(52000);
  });
});
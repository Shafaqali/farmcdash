import { describe, expect, it } from "vitest";
import { splitBalance, farmBalance } from "@/lib/farm-balance";
import type { Animal, Payment } from "@/lib/farm-data";
describe("Outstanding and advance", () => {
  it("shows 500 charges and 4000 received as zero outstanding and 3500 credit", () => { expect(splitBalance(500,4000)).toEqual({ outstanding:0,advance:3500 }); });
  it("shows unpaid charges as outstanding without negative credit", () => { expect(splitBalance(4000,500)).toEqual({ outstanding:3500,advance:0 }); });
  it("does not let another customer's credit hide an unpaid customer's debt", () => {
    const animals = [{id:"A",ownerId:"one",arrival:"2026-11-01",monthlyCharge:500},{id:"B",ownerId:"two",arrival:"2026-11-01",monthlyCharge:500}] as Animal[];
    const payments = [{id:"P",customerId:"one",amount:4000,date:"2026-11-01"}] as Payment[];
    expect(farmBalance(["one","two"],animals,payments,"2026-11-19")).toEqual({ outstanding:500,advance:3500 });
  });
});
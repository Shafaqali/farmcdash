import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PaymentReminders } from "@/components/PaymentReminders";
const mocks=vi.hoisted(()=>({rpc:vi.fn(),success:vi.fn(),info:vi.fn(),error:vi.fn()}));
vi.mock("@/lib/farm-data",()=>({useFarm:()=>({role:"owner"})}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{rpc:mocks.rpc}}));
vi.mock("sonner",()=>({toast:{success:mocks.success,info:mocks.info,error:mocks.error}}));
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:1,error:null});});afterEach(cleanup);
it("queues a fresh reminder on each completed press",async()=>{
 render(<PaymentReminders/>);const button=screen.getByRole("button",{name:"Remind unpaid customers"});
 fireEvent.click(button);await waitFor(()=>expect(mocks.success).toHaveBeenCalledTimes(1));await waitFor(()=>expect(button).not.toBeDisabled());
 fireEvent.click(button);await waitFor(()=>expect(mocks.success).toHaveBeenCalledTimes(2));
 expect(mocks.rpc).toHaveBeenNthCalledWith(2,"remind_unpaid_customers_now");expect(mocks.info).not.toHaveBeenCalled();
});
it("reports no eligible linked debt without claiming successful delivery",async()=>{
 mocks.rpc.mockResolvedValue({data:0,error:null});render(<PaymentReminders/>);fireEvent.click(screen.getByRole("button"));
 await waitFor(()=>expect(mocks.info).toHaveBeenCalledWith(expect.stringContaining("No linked customers")));expect(mocks.success).not.toHaveBeenCalled();
});
it("makes missing SQL actionable and leaves retries available",async()=>{
 mocks.rpc.mockResolvedValue({data:null,error:{code:"PGRST202"}});render(<PaymentReminders/>);fireEvent.click(screen.getByRole("button"));
 await waitFor(()=>expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("v35 SQL")));expect(screen.getByRole("button")).not.toBeDisabled();
});

import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { AccountProfileSettings } from "@/components/AccountProfileSettings";
const mocks=vi.hoisted(()=>({role:"customer"}));
vi.mock("@/lib/farm-data",()=>({useFarm:()=>({uid:"account",role:mocks.role})}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:(table:string)=>({select:()=>({eq:()=>table==="profiles"?{single:async()=>({data:{full_name:"Customer",phone:"1234567890",contact_email:"c@example.com",user_code:"C01"}})}:Promise.resolve({data:[{kind:"id",display_value:"AssignedCustomer"}]})})})}}));
afterEach(cleanup);
it("keeps customer assigned login IDs read-only",async()=>{
 mocks.role="customer";render(<QueryClientProvider client={new QueryClient()}><AccountProfileSettings/></QueryClientProvider>);
 expect(await screen.findByLabelText("Login ID")).toHaveAttribute("readonly");expect(screen.getByLabelText("Login ID")).toHaveValue("AssignedCustomer");
});
it("retains owner login ID editing",async()=>{
 mocks.role="owner";render(<QueryClientProvider client={new QueryClient()}><AccountProfileSettings/></QueryClientProvider>);
 expect(await screen.findByLabelText("Login ID")).not.toHaveAttribute("readonly");
});

import { Marketplace } from "@/components/marketplace";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export default function Home() {
  return (
    <>
      <SiteHeader />
      <Marketplace />
      <SiteFooter />
    </>
  );
}

import { metadataFor } from "@/components/public-pages/metadata";
import { RafflesPage } from "@/components/public-pages/pages";

export const metadata = metadataFor("raffles");
export const revalidate = 3600;

export default RafflesPage;

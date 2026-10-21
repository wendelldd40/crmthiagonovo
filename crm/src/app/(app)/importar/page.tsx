"use client";
import { useState } from "react";
import { FileSpreadsheet, MapPinned } from "lucide-react";
import { PageBody, PageHeader } from "@/components/shell/page-header";
import { Segmented } from "@/components/ui/segmented";
import { ImportarGoogle } from "@/components/crm/importar-google";
import { ImportarPlanilha } from "@/components/crm/importar-planilha";

export default function ImportarPage() {
  const [aba, setAba] = useState<"google" | "planilha">("google");
  return (
    <>
      <PageHeader title="Importar leads" subtitle="Clínicas, hospitais e pet shops do Google Maps, ou uma planilha sua">
        <Segmented value={aba} onChange={setAba} options={[
          { value: "google", label: <><MapPinned /> Google Maps</> },
          { value: "planilha", label: <><FileSpreadsheet /> Planilha</> },
        ]} />
      </PageHeader>
      <PageBody>
        {aba === "google" ? <ImportarGoogle /> : <ImportarPlanilha />}
      </PageBody>
    </>
  );
}

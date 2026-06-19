import PageHeader from "@/components/PageHeader";
import ChatClient from "./ChatClient";

export default function IaImpulsoPage() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <PageHeader
        title="IA Impulso"
        subtitle="Chat estratégico que analisa os dados da sua operação em tempo real."
      />
      <ChatClient />
    </div>
  );
}

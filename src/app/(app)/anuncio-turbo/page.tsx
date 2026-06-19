import PageHeader from "@/components/PageHeader";
import AdGeneratorForm from "./AdGeneratorForm";

export default function AnuncioTurboPage() {
  return (
    <div>
      <PageHeader
        title="Anúncio Turbo"
        subtitle="Gere título, descrição, SEO, FAQ, palavras-chave e bullets otimizados com IA para Mercado Livre e Shopee."
      />
      <AdGeneratorForm />
    </div>
  );
}

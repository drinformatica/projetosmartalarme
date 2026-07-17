import { createFileRoute } from "@tanstack/react-router";
import { QuoteEditor } from "@/lib/quote-editor";

export const Route = createFileRoute("/_authenticated/orcamento")({
  component: () => <QuoteEditor />,
  head: () => ({ meta: [{ title: "Novo Orçamento - Intrusão 2.0" }] }),
});

import { createFileRoute, useParams } from "@tanstack/react-router";
import { QuoteEditor } from "@/lib/quote-editor";

export const Route = createFileRoute("/_authenticated/orcamento/$id")({
  component: Wrapper,
  head: () => ({ meta: [{ title: "Orçamento - Intrusão 2.0" }] }),
});

function Wrapper() {
  const { id } = useParams({ from: "/_authenticated/orcamento/$id" });
  return <QuoteEditor id={id} />;
}

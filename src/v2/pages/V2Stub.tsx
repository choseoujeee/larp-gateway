import { V2Shell } from "../components/V2Shell";
import { Construction } from "lucide-react";

interface Props {
  title: string;
  larpName?: string;
  runName?: string;
  description?: string;
}

export default function V2Stub({ title, larpName, runName, description }: Props) {
  return (
    <V2Shell larpName={larpName} runName={runName}>
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-3 rounded border border-dashed border-border bg-card/50 p-10 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <h1 className="font-typewriter text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {description ?? "Tato sekce se staví v rámci v2. Brzy bude k dispozici."}
          </p>
        </div>
      </div>
    </V2Shell>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { InvestigationPanel } from "@/components/investigation/investigation-panel";
import { NameDialog } from "@/components/ui/name-dialog";
import { useUserName } from "@/hooks/use-user-name";

export default function InvestigationPage() {
  const params = useParams<{ incidentId: string }>();
  const [incidentId, setIncidentId] = useState<string>(params.incidentId);
  const [userName, setUserName] = useUserName();

  const handleIncidentCreated = useCallback(
    (newId: string) => {
      setIncidentId(newId);
      // Update URL without triggering a Next.js navigation (which would remount and lose chat state)
      window.history.replaceState(null, "", `/investigation/${newId}`);
    },
    []
  );

  if (!userName) {
    return <NameDialog onSubmit={setUserName} />;
  }

  return (
    <div className="flex h-screen">
      {/* Chat Panel — left side */}
      <div className="flex-1 min-w-0 border-r border-border-subtle" style={{ flex: "45 1 0%" }}>
        <ChatPanel
          incidentId={incidentId}
          userName={userName}
          onIncidentCreated={incidentId === "new" ? handleIncidentCreated : undefined}
        />
      </div>

      {/* Investigation Panel — right side */}
      <div className="flex-1 min-w-0" style={{ flex: "55 1 0%" }}>
        <InvestigationPanel incidentId={incidentId === "new" ? null : incidentId} />
      </div>
    </div>
  );
}

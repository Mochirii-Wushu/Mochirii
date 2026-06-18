import type { ReactNode } from "react";

type WorkflowNoticeTone = "info" | "success" | "warning" | "danger";

export function WorkflowNotice({
  children,
  hidden = false,
  id,
  tone = "info",
  role = "status",
}: {
  children: ReactNode;
  hidden?: boolean;
  id?: string;
  tone?: WorkflowNoticeTone;
  role?: "status" | "alert";
}) {
  return (
    <p
      className={`workflow-notice workflow-notice--${tone}`}
      hidden={hidden}
      id={id}
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
    >
      {children}
    </p>
  );
}

export function WorkflowEmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="workflow-empty-state" role="status" aria-live="polite">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

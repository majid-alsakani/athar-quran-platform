export type ExternalDeliveryInput = {
  channel: "email" | "whatsapp";
  recipient: string;
  attachmentStorageKey: string;
  weeklyReportId: number;
};

export type ExternalDeliveryResult =
  | { state: "sent"; providerMessageId: string }
  | { state: "not_configured"; reason: string }
  | { state: "failed"; reason: string };

/**
 * Deliberately performs no network request until the owner selects and configures a provider.
 * It keeps the delivery record queued, preventing any accidental email or WhatsApp dispatch.
 */
export async function dispatchExternalWeeklyReport(_input: ExternalDeliveryInput): Promise<ExternalDeliveryResult> {
  return {
    state: "not_configured",
    reason: "لم يُعتمد مزود بريد أو واتساب بعد؛ بقي التقرير في قائمة الانتظار ولم تُرسل أي رسالة.",
  };
}
